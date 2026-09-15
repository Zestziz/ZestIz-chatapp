import { useEffect, useRef, useCallback } from "react";

/**
 * Intercepts the browser / Android hardware back button while a subview is active.
 * Each open "layer" (active chat on mobile, modal) should call this hook with
 * its own `isActive` flag and `onBack` handler.
 *
 * The hook pushes a synthetic history entry when `isActive` becomes true and
 * removes it (via history.back()) when the view is closed by normal means,
 * keeping the history stack clean. A popstate event (back button) triggers
 * `onBack` instead of letting the browser navigate away.
 *
 * @param {boolean}  isActive  - Whether this layer is currently open.
 * @param {Function} onBack    - Callback invoked when the back button is pressed.
 * @param {object}   [options]
 * @param {number}   [options.priority=0] - Higher priority layers handle the
 *                                          back button first (topmost modal wins).
 */
export function useMobileBackHandler(isActive, onBack, { priority = 0 } = {}) {
  const pushed = useRef(false);

  // Stable reference so the popstate handler never captures a stale closure.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const pushState = useCallback(() => {
    if (!pushed.current) {
      window.history.pushState({ _zestizBack: true, priority }, "");
      pushed.current = true;
    }
  }, [priority]);

  const popStateSelf = useCallback(() => {
    if (pushed.current) {
      // Only go back if the current state is ours — avoid consuming unrelated entries.
      if (window.history.state?._zestizBack) {
        window.history.back();
      }
      pushed.current = false;
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      pushState();
    } else {
      // View closed by an on-screen button: clean up the synthetic history entry.
      popStateSelf();
    }
    // No cleanup here — managed explicitly when isActive flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    const handlePopState = (e) => {
      // Only intercept if we pushed this entry.
      if (!pushed.current) return;
      // If the state is not ours, bail (another hook should handle it).
      if (!e.state?._zestizBack) return;

      pushed.current = false;
      onBackRef.current?.();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Cleanup on unmount: if still holding a synthetic state, pop it.
  useEffect(() => {
    return () => {
      if (pushed.current) {
        pushed.current = false;
        if (window.history.state?._zestizBack) {
          window.history.back();
        }
      }
    };
  }, []);
}
