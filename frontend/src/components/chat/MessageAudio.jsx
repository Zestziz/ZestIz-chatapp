import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";

let activeAudioElement = null;

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function MessageAudio({ audio }) {
  const audioElementRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return undefined;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audioElement.duration)) setDuration(audioElement.duration);
    };
    const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audioElement.currentTime = 0;
    };
    const handleError = () => {
      setIsPlaying(false);
      setHasError(true);
    };

    audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);
    audioElement.addEventListener("error", handleError);

    return () => {
      audioElement.pause();
      audioElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
      audioElement.removeEventListener("error", handleError);
      if (activeAudioElement === audioElement) activeAudioElement = null;
    };
  }, [audio.url]);

  const togglePlayback = async () => {
    const audioElement = audioElementRef.current;
    if (!audioElement || hasError) return;

    if (audioElement.paused) {
      if (activeAudioElement && activeAudioElement !== audioElement) {
        activeAudioElement.pause();
      }
      activeAudioElement = audioElement;
      try {
        await audioElement.play();
      } catch {
        setHasError(true);
      }
    } else {
      audioElement.pause();
    }
  };

  const handleSeek = (event) => {
    const audioElement = audioElementRef.current;
    const nextTime = Number(event.target.value);
    if (!audioElement || !Number.isFinite(nextTime)) return;
    audioElement.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="flex min-w-52 max-w-full items-center gap-2">
      <audio className="hidden" ref={audioElementRef} src={audio.url} preload="metadata" />
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/20 text-current hover:bg-background/30 disabled:opacity-50"
        onClick={togglePlayback}
        disabled={hasError}
        aria-label={hasError ? "Audio unavailable" : isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          disabled={hasError || !duration}
          className="h-1.5 w-full accent-current"
          aria-label="Seek voice message"
        />
        <div className="flex justify-between text-[10px] opacity-75">
          <span>{hasError ? "Unavailable" : formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
