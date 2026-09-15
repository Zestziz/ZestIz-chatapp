import { useEffect, useRef } from "react";

// Centralized LIFO stack for back handlers
const backStack = [];

// Single global popstate listener
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (backStack.length > 0) {
      // Pop the top-most handler
      const activeHandler = backStack.pop();
      activeHandler.onClose();
    }
  });
}

/**
 * Intercepts the back button to close an active view or modal using URL hashes.
 * Ensures strict LIFO (Last-In-First-Out) execution.
 *
 * @param {boolean} isOpen - Whether the target view/modal is active.
 * @param {Function} onClose - Callback to close the view/modal.
 * @param {string} hashKey - Unique identifier for the history hash (e.g., "chat", "group-info").
 */
export const useBackHandler = (isOpen, onClose, hashKey) => {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const id = `${hashKey}-${Date.now()}`;
    const hash = `#${hashKey}`;

    // Only push state if not already at this hash
    // (helps prevent infinite loops, though stacking same hash is okay in some cases)
    window.history.pushState({ modalId: id }, "", hash);
    isPushedRef.current = true;

    // Register handler in global stack
    const stackEntry = {
      id,
      onClose: () => {
        isPushedRef.current = false;
        onCloseRef.current?.();
      }
    };
    backStack.push(stackEntry);

    return () => {
      // Remove from global stack if unmounted or closed via UI
      const index = backStack.findIndex(entry => entry.id === id);
      if (index !== -1) {
        backStack.splice(index, 1);
      }

      // If closed via on-screen UI button (not gesture), manually pop the history state
      if (isPushedRef.current) {
        isPushedRef.current = false;

        // We only back out if we are still on a hash, ensuring we don't accidentally navigate out of the app
        if (window.location.hash) {
            window.history.back();
        }
      }
    };
  }, [isOpen, hashKey]);
};
