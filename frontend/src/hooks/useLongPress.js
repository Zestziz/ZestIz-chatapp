import { useCallback, useRef } from "react";

/**
 * useLongPress Hook
 *
 * @param {Function} onLongPress - Callback fired when long-press threshold is reached
 * @param {Function} onClick - Optional fallback click handler
 * @param {Object} options
 * @param {number} options.delay - Hold duration in ms (default: 750ms)
 * @param {number} options.moveThreshold - Maximum allowed touch drift in px before canceling (default: 10px)
 */
export function useLongPress(
  onLongPress,
  onClick,
  { delay = 750, moveThreshold = 10 } = {}
) {
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startCoordinatesRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (e) => {
      isLongPressRef.current = false;
      const point = e.touches ? e.touches[0] : e;
      startCoordinatesRef.current = { x: point.clientX, y: point.clientY };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch {
            // Ignore vibration errors on unsupported environments
          }
        }
        if (onLongPress) {
          onLongPress(e);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    []
  );

  const move = useCallback(
    (e) => {
      if (!timerRef.current) return;
      const point = e.touches ? e.touches[0] : e;
      const diffX = Math.abs(point.clientX - startCoordinatesRef.current.x);
      const diffY = Math.abs(point.clientY - startCoordinatesRef.current.y);

      if (diffX > moveThreshold || diffY > moveThreshold) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    [moveThreshold]
  );

  const handleClick = useCallback(
    (e) => {
      if (isLongPressRef.current) {
        e.preventDefault?.();
        e.stopPropagation?.();
        isLongPressRef.current = false;
        return;
      }
      if (onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  return {
    handlers: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: move,
      onClick: handleClick,
    },
    isLongPress: isLongPressRef,
  };
}
