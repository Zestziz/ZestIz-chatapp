import { useEffect, useRef } from "react";

// Centralized LIFO stack for back handlers
const backStack = [];
let isProgrammaticPop = false;

// Single global popstate listener
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    // If popstate was triggered programmatically by UI button cleanup, ignore it!
    if (isProgrammaticPop) {
      isProgrammaticPop = false;
      return;
    }

    // Otherwise, this was a real user hardware/gesture back press
    if (backStack.length > 0) {
      // Pop the top-most handler
      const activeHandler = backStack.pop();
      activeHandler.onClose();
    }
  });
}

/**
 * Intercepts the back button to close an active view or modal using URL hashes.
 * Ensures strict LIFO (Last-In-First-Out) execution and suppresses synthetic
 * popstate events during programmatic UI dismissal.
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

    // Push a new history state entry
    window.history.pushState({ modalId: id }, "", hash);
    isPushedRef.current = true;

    // Register handler in global stack
    const stackEntry = {
      id,
      hash,
      onClose: () => {
        isPushedRef.current = false;
        onCloseRef.current?.();
      }
    };
    backStack.push(stackEntry);

    return () => {
      // Remove from global stack if unmounted or closed via UI
      const index = backStack.findIndex((entry) => entry.id === id);
      if (index !== -1) {
        backStack.splice(index, 1);
      }

      // If closed via on-screen UI button (not hardware gesture), manually pop the history state
      if (isPushedRef.current) {
        isPushedRef.current = false;

        if (window.location.hash === hash) {
          isProgrammaticPop = true; // Tell popstate listener NOT to execute parent handlers
          window.history.back();
        }
      }
    };
  }, [isOpen, hashKey]);
};
