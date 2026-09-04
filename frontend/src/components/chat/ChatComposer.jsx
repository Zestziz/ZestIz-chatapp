import { Button, TextArea } from "@heroui/react";
import { BarChart3Icon, ImageIcon, LoaderIcon, MicIcon, PencilIcon, PlusIcon, SendHorizontalIcon, SquareIcon, XIcon } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import useKeyboardSound from "../../hooks/useKeyboardSound";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { MessageAudio } from "./MessageAudio";
import { PollModal } from "./PollModal";

const MAX_RECORDING_SECONDS = 300;
const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function formatRecordingTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const sendAudioMessage = useChatStore((state) => state.sendAudioMessage);
  const createPoll = useChatStore((state) => state.createPoll);
  const isSendingMedia = useChatStore((state) => state.isSendingMedia);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const replyingTo = useChatStore((state) => state.replyingTo);
  const clearReplyingTo = useChatStore((state) => state.clearReplyingTo);
  const editingMessage = useChatStore((state) => state.editingMessage);
  const selectedGroup = useChatStore((state) => state.selectedGroup);
  const editMessage = useChatStore((state) => state.editMessage);
  const cancelEditing = useChatStore((state) => state.cancelEditing);
  const { activeConversationId } = useSelectedConversation();
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const mediaInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const previewUrlRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPreview, setRecordingPreview] = useState(null);
  const [recordingError, setRecordingError] = useState("");
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(null);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  const authUser = useAuthStore((state) => state.authUser);

  const suggestedMentions = selectedGroup && mentionQuery !== null
    ? [
        { _id: 'everyone', fullName: 'everyone', username: 'everyone' },
        ...(selectedGroup.members?.filter(m => String(m._id) !== String(authUser?._id)) || [])
      ].filter(m => (m.username || '').toLowerCase().includes(mentionQuery) || m.fullName.toLowerCase().includes(mentionQuery))
    : [];

  const handleMentionSelect = (user) => {
    if (mentionIndex === null) return;
    const before = composerText.slice(0, mentionIndex);
    const after = composerText.slice(textAreaRef.current?.selectionStart || mentionIndex + mentionQuery.length + 1);

    const insertText = user._id === 'everyone' ? '@everyone ' : (user.username ? `@${user.username} ` : `@[${user.fullName}](${user._id}) `);
    const newText = before + insertText + after;
    setComposerText(newText);
    setMentionQuery(null);
    setMentionIndex(null);

    setTimeout(() => {
        textAreaRef.current?.focus();
        const cursor = before.length + insertText.length;
        textAreaRef.current?.setSelectionRange?.(cursor, cursor);
    }, 0);
  };

  useEffect(() => {
    if (replyingTo) textAreaRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    // When activeConversationId changes, or on unmount, make sure we clean up previous typing state
    return () => {
      if (isTypingRef.current && activeConversationId) {
        const socket = useAuthStore.getState().socket;
        socket?.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingRef.current = false;
    };
  }, [activeConversationId, selectedGroup]);

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) playRandomKeyStrokeSound();
  };

  const clearRecordingPreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setRecordingPreview(null);
  };

  const stopRecordingTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const stopTyping = () => {
    if (isTypingRef.current && activeConversationId) {
      useAuthStore.getState().socket?.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isRecording || isSendingMedia || editingMessage) return;
    setRecordingError("");
    clearRecordingPreview();

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError("Voice recording is not supported in this browser");
      return;
    }

    stopTyping();
    const conversationIdAtStart = activeConversationId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (conversationIdAtStart !== useChatStore.getState().activeConversationId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const Recorder = window.MediaRecorder;
      const mimeType = RECORDING_MIME_TYPES.find((type) => Recorder.isTypeSupported(type));
      const recorder = mimeType ? new Recorder(stream, { mimeType }) : new Recorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      discardRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingError("Recording failed. Please try again.");
        stopRecordingTracks();
        setIsRecording(false);
      };
      recorder.onstop = () => {
        stopRecordingTracks();
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setIsRecording(false);
        setRecordingSeconds(0);
        mediaRecorderRef.current = null;
        if (discardRecordingRef.current) {
          recordingChunksRef.current = [];
          return;
        }

        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        recordingChunksRef.current = [];
        const duration = Math.min(
          MAX_RECORDING_SECONDS,
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000),
        );
        if (!blob.size || duration <= 0) {
          setRecordingError("The recording was empty");
          return;
        }
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setRecordingPreview({ blob, url, duration });
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));
        if (elapsed >= MAX_RECORDING_SECONDS && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 250);
    } catch (error) {
      stopRecordingTracks();
      setIsRecording(false);
      setRecordingError(error.name === "NotAllowedError" ? "Microphone permission was denied" : "Unable to access the microphone");
    }
  };

  const stopRecording = () => {
    discardRecordingRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    else stopRecordingTracks();
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingChunksRef.current = [];
  };

  const handleSendAudio = async () => {
    if (!recordingPreview || isSendingMedia) return;
    const didSendAudio = await sendAudioMessage({
      conversationId: activeConversationId,
      blob: recordingPreview.blob,
      duration: recordingPreview.duration,
    });
    if (didSendAudio) {
      clearRecordingPreview();
      playSoundIfEnabled();
    }
  };

  useEffect(() => () => {
    discardRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    stopRecordingTracks();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setRecordingPreview(null);
    setIsRecording(false);
    setRecordingSeconds(0);
  }, [activeConversationId]);

  const handleSend = async () => {
    if (isTypingRef.current && activeConversationId) {
      const socket = useAuthStore.getState().socket;
      socket?.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const didSendMessage = editingMessage
      ? await editMessage(editingMessage.id, composerText)
      : await sendTextMessage(activeConversationId);
    if (didSendMessage) playSoundIfEnabled();
  };

  const handleComposerTextChange = (event) => {
    const value = event.target.value;
    setComposerText(value);
    playSoundIfEnabled();

    // Mention detection
    const cursor = event.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const startIdx = textBeforeCursor.lastIndexOf("@");
    if (startIdx !== -1 && (startIdx === 0 || /\s/.test(textBeforeCursor[startIdx - 1]))) {
      const query = textBeforeCursor.slice(startIdx + 1);
      if (!/\s/.test(query) && selectedGroup) {
        setMentionQuery(query.toLowerCase());
        setMentionIndex(startIdx);
      } else {
        setMentionQuery(null);
        setMentionIndex(null);
      }
    } else {
      setMentionQuery(null);
      setMentionIndex(null);
    }

    const socket = useAuthStore.getState().socket;
    if (!socket || !activeConversationId) return;

    if (!value.trim()) {
      if (isTypingRef.current) {
        socket.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleMediaPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (isTypingRef.current && activeConversationId) {
      const socket = useAuthStore.getState().socket;
      socket?.emit("stopTyping", selectedGroup ? { groupId: selectedGroup._id } : { receiverId: activeConversationId });
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
    });

    if (didSendMessage) playSoundIfEnabled();
  };

  const handleCreatePoll = async (question, options) => {
    if (isTypingRef.current) stopTyping();
    return createPoll(activeConversationId, question, options);
  };

  const handleAttachmentAction = (action) => {
    setIsAttachmentMenuOpen(false);
    if (action === "media") mediaInputRef.current?.click();
    if (action === "voice") startRecording();
    if (action === "poll") setIsPollOpen(true);
  };

  return (
    <footer className="relative shrink-0 border-t border-border/70 bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4">
      {editingMessage ? (
        <div className="mx-auto mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <p className="flex items-center gap-1 text-xs font-semibold text-accent">
              <PencilIcon className="size-3.5" /> Editing message
            </p>
            <p className="truncate text-xs text-muted">{editingMessage.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Cancel editing"
            onPress={cancelEditing}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : replyingTo ? (
        <div className="mx-auto mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <p className="truncate text-xs font-semibold text-accent">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-xs text-muted">
              {replyingTo.text || (replyingTo.imageUrl ? "📷 Image" : replyingTo.videoUrl ? "🎥 Video" : replyingTo.audio ? "🎙️ Voice message" : "Message")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Cancel reply"
            onPress={clearReplyingTo}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : null}
      {isSendingMedia ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          <LoaderIcon
            className="size-4 shrink-0 animate-spin text-accent"
            strokeWidth={2}
            aria-hidden
          />
          <span className="truncate">Uploading media...</span>
        </div>
      ) : null}
      {recordingError ? <p className="mb-2 px-2 text-xs text-danger">{recordingError}</p> : null}
      {/* Mentions Autocomplete Dropdown */}
      {suggestedMentions.length > 0 && (
        <div className="mx-auto mb-2 flex max-h-48 w-full max-w-4xl flex-col overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg absolute bottom-full left-0 z-50">
          {suggestedMentions.map((user) => (
            <button
              key={user._id}
              type="button"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-accent-soft focus-visible:bg-accent-soft"
              onClick={() => handleMentionSelect(user)}
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                {user.fullName[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{user.fullName}</span>
                {user.username && user._id !== 'everyone' && (
                  <span className="text-xs text-muted">@{user.username}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isRecording ? (
        <div className="mx-auto flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden />
            Recording {formatRecordingTime(recordingSeconds)}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onPress={cancelRecording}>Cancel</Button>
            <Button variant="primary" size="sm" isIconOnly aria-label="Stop recording" onPress={stopRecording}>
              <SquareIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : recordingPreview ? (
        <div className="mx-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <div className="min-w-0 flex-1">
            <MessageAudio audio={recordingPreview} />
          </div>
          <Button variant="ghost" size="sm" onPress={clearRecordingPreview}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            isIconOnly
            isDisabled={isSendingMedia}
            aria-label="Send voice message"
            onPress={handleSendAudio}
          >
            <SendHorizontalIcon className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-4xl items-end gap-1 px-0 sm:gap-2">
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          disabled={isSendingMedia || Boolean(editingMessage)}
          tabIndex={-1}
          aria-hidden
          onChange={handleMediaPick}
        />
        <div className="relative min-[480px]:hidden">
          <Button
            variant="ghost"
            isIconOnly
            isDisabled={isSendingMedia || Boolean(editingMessage)}
            className="size-10 shrink-0 touch-manipulation self-end text-accent"
            aria-label="Add attachment"
            onPress={() => setIsAttachmentMenuOpen((open) => !open)}
          >
            <PlusIcon className="size-5" strokeWidth={2.25} />
          </Button>
          {isAttachmentMenuOpen ? <div className="absolute bottom-12 left-0 z-40 flex min-w-36 flex-col gap-1 rounded-xl border border-border bg-background p-1.5 shadow-xl">
            <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent-soft" onClick={() => handleAttachmentAction("media")}><ImageIcon className="size-4 text-accent" /> Photo or video</button>
            <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent-soft" onClick={() => handleAttachmentAction("voice")}><MicIcon className="size-4 text-accent" /> Voice message</button>
            <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent-soft" onClick={() => handleAttachmentAction("poll")}><BarChart3Icon className="size-4 text-accent" /> Poll</button>
          </div> : null}
        </div>
        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSendingMedia || Boolean(editingMessage)}
          className="hidden size-10 shrink-0 touch-manipulation self-end text-accent min-[480px]:inline-flex"
          aria-label="Choose photo or video"
          onPress={() => mediaInputRef.current?.click()}
        >
          <ImageIcon className="size-5 sm:size-6" strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSendingMedia || Boolean(editingMessage)}
          className="hidden size-10 shrink-0 touch-manipulation self-end text-accent min-[640px]:inline-flex"
          aria-label="Record voice message"
          onPress={startRecording}
        >
          <MicIcon className="size-5" strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSendingMedia || Boolean(editingMessage)}
          className="hidden size-10 shrink-0 touch-manipulation self-end text-accent min-[640px]:inline-flex"
          aria-label="Create poll"
          onPress={() => setIsPollOpen(true)}
        >
          <BarChart3Icon className="size-5" strokeWidth={2} />
        </Button>
        <TextArea
          ref={textAreaRef}
          fullWidth
          variant="secondary"
          placeholder="iMessage"
          rows={1}
          value={composerText}
          onChange={handleComposerTextChange}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          className="min-w-0 flex-1 rounded-[14px]"
        />

        <Button variant="primary" isIconOnly isDisabled={!composerText.trim()} onPress={handleSend}>
          <SendHorizontalIcon className="size-5" />
        </Button>
        </div>
      )}
      {isPollOpen ? <PollModal onClose={() => setIsPollOpen(false)} onCreate={handleCreatePoll} /> : null}
    </footer>
  );
}