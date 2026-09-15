import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ZoomInIcon, ZoomOutIcon, DownloadIcon, XIcon, Loader2Icon } from "lucide-react";

export function ImageViewerModal({ imageUrl, alt = "", onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const dragStartInfo = useRef({ x: 0, y: 0, posX: 0, posY: 0, moved: false });
  const lastTapRef = useRef(0);
  const pinchStartInfo = useRef({ distance: 0, scale: 1 });

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  const clampPosition = useCallback((x, y, currentScale) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    if (!containerRef.current || !imageRef.current) return { x, y };

    const container = containerRef.current.getBoundingClientRect();
    const image = imageRef.current.getBoundingClientRect();

    const originalWidth = image.width / currentScale;
    const originalHeight = image.height / currentScale;

    const maxX = Math.max(0, (originalWidth * currentScale - container.width) / 2);
    const maxY = Math.max(0, (originalHeight * currentScale - container.height) / 2);

    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  }, []);

  const updateTransform = useCallback((newScale, newX, newY) => {
    let s = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    let { x, y } = clampPosition(newX, newY, s);
    if (s <= 1) {
      x = 0;
      y = 0;
    }
    setScale(s);
    setPosition({ x, y });
  }, [clampPosition]);

  const handleZoomIn = useCallback(() => {
    updateTransform(scale + 0.5, position.x, position.y);
  }, [scale, position, updateTransform]);

  const handleZoomOut = useCallback(() => {
    updateTransform(scale - 0.5, position.x, position.y);
  }, [scale, position, updateTransform]);

  const handleReset = useCallback(() => {
    updateTransform(1, 0, 0);
  }, [updateTransform]);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      updateTransform(1, 0, 0);
    } else {
      updateTransform(2.5, 0, 0);
    }
  }, [scale, updateTransform]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleReset();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset, onClose]);

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.005;
    const newScale = scale + delta;
    updateTransform(newScale, position.x, position.y);
  };

  // Drag to pan (Mouse)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartInfo.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
      moved: false,
    };
    if (scale > 1) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e) => {
    const dx = e.clientX - dragStartInfo.current.x;
    const dy = e.clientY - dragStartInfo.current.y;
    if (Math.hypot(dx, dy) > 3) {
      dragStartInfo.current.moved = true;
    }
    if (!isDragging || scale <= 1) return;
    updateTransform(scale, dragStartInfo.current.posX + dx, dragStartInfo.current.posY + dy);
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    // Backdrop click detection
    if (!dragStartInfo.current.moved && e.target === containerRef.current) {
      onClose();
    }
  };

  // Touch Gestures (Mobile)
  const getTouchDistance = (t1, t2) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      pinchStartInfo.current = {
        distance: getTouchDistance(e.touches[0], e.touches[1]),
        scale: scale,
      };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleClick();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      dragStartInfo.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        posX: position.x,
        posY: position.y,
        moved: false,
      };

      if (scale > 1) {
        setIsDragging(true);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const deltaScale = dist / (pinchStartInfo.current.distance || 1);
      const newScale = pinchStartInfo.current.scale * deltaScale;
      updateTransform(newScale, position.x, position.y);
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStartInfo.current.x;
      const dy = e.touches[0].clientY - dragStartInfo.current.y;
      if (Math.hypot(dx, dy) > 5) {
        dragStartInfo.current.moved = true;
      }
      if (isDragging && scale > 1) {
        updateTransform(scale, dragStartInfo.current.posX + dx, dragStartInfo.current.posY + dy);
      }
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    if (!dragStartInfo.current.moved && e.target === containerRef.current) {
      onClose();
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = imageUrl.split("/").pop() || "download.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image", error);
      window.open(imageUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md select-none touch-none overscroll-none animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <button
        type="button"
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close image viewer"
      >
        <XIcon className="size-6" />
      </button>

      {/* Main Image */}
      {!isLoaded && <Loader2Icon className="absolute z-10 size-8 animate-spin text-white/50" />}

      <img
        ref={imageRef}
        src={imageUrl}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`max-w-full max-h-[100dvh] object-contain transition-transform will-change-transform ${isDragging ? "duration-0 cursor-grabbing" : "duration-200 ease-out"} ${scale > 1 && !isDragging ? "cursor-grab" : ""}`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          opacity: isLoaded ? 1 : 0
        }}
        onDoubleClick={handleDoubleClick}
        onDragStart={(e) => e.preventDefault()}
      />

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-full border border-zinc-800 bg-zinc-900/80 backdrop-blur-lg shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out"
        >
          <ZoomOutIcon className="size-5" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
          className="px-2 py-1 min-w-[3.5rem] rounded-md text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors tabular-nums"
          title="Reset Zoom"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom In"
        >
          <ZoomInIcon className="size-5" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1"></div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700/50 transition-colors relative"
          title="Download Image"
        >
          {isDownloading ? <Loader2Icon className="size-5 animate-spin" /> : <DownloadIcon className="size-5" />}
        </button>
      </div>
    </div>,
    document.body
  );
}
