import { useEffect, useRef } from "react";

/**
 * Intercepts the back button to close an active view or modal using URL hashes.
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

    // Push a new history entry when opened
    const hash = `#${hashKey}`;
    if (window.location.hash !== hash) {
      window.history.pushState({ modal: hashKey }, "", hash);
      isPushedRef.current = true;
    }

    const handlePopState = () => {
      // Back gesture was triggered by Android/browser
      isPushedRef.current = false;
      onCloseRef.current?.();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // If closed via on-screen UI button, pop the synthetic history entry
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.location.hash === hash) {
          window.history.back();
        }
      }
    };
  }, [isOpen, hashKey]);
};
