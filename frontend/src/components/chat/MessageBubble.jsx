import { useEffect, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@heroui/react";
import { CornerUpLeftIcon, PencilIcon, PinIcon, SmilePlusIcon, Trash2Icon, CopyIcon, AtSignIcon, ClockIcon, AlertCircleIcon } from "lucide-react";
import { getOptimizedMediaUrl } from "../../lib/imagekit";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { MessageVideo } from "./MessageVideo";
import { MessageAudio } from "./MessageAudio";
import { PollCard } from "./PollCard";
import { ImageViewerModal } from "./ImageViewerModal";
import { ReactionDetailsModal } from "./ReactionDetailsModal";
import { getInitials } from "../../hooks/useSelectedConversation";
import toast from "react-hot-toast";

const REACTION_OPTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "😡"];

function renderFormattedMessage(text, isOwnMessage) {
  if (!text) return null;
  const regex = /(@everyone\b)|(@\[([^\]]+)\]\([a-fA-F0-9]{24}\))|(@[a-zA-Z0-9_.-]+)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      elements.push(
        <span
          key={match.index}
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
            isOwnMessage ? "bg-white/25 text-white" : "bg-accent/20 text-accent"
          }`}
        >
          @everyone
        </span>
      );
    } else if (match[2]) {
      const name = match[3];
      elements.push(
        <span
          key={match.index}
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
            isOwnMessage ? "bg-white/25 text-white" : "bg-accent/20 text-accent"
          }`}
        >
          @{name}
        </span>
      );
    } else if (match[4]) {
      elements.push(
        <span
          key={match.index}
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
            isOwnMessage ? "bg-white/25 text-white" : "bg-accent/20 text-accent"
          }`}
        >
          {match[4]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

export const MessageBubble = memo(function MessageBubble({ message, onReply, onNavigateToReply }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDeleteDropdownOpen, setIsDeleteDropdownOpen] = useState(false);
  const [confirmDeleteType, setConfirmDeleteType] = useState(null); // "me" | "everyone" | null
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isReactionDetailsOpen, setIsReactionDetailsOpen] = useState(false);
  const [reactionModalEmoji, setReactionModalEmoji] = useState("all");
  const pickerRef = useRef(null);
  const deleteConfirmRef = useRef(null);
  const authUser = useAuthStore((state) => state.authUser);
  const reactToMessage = useChatStore((state) => state.reactToMessage);
  const startEditingMessage = useChatStore((state) => state.startEditingMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const deleteMessageForMe = useChatStore((state) => state.deleteMessageForMe);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const votePoll = useChatStore((state) => state.votePoll);
  const closePoll = useChatStore((state) => state.closePoll);
  const pinMessage = useChatStore((state) => state.pinMessage);
  const selectedGroup = useChatStore((state) => state.selectedGroup);
  const isOwnMessage = message.role === "me";
  const hasImage = Boolean(message.imageUrl);
  const hasVideo = Boolean(message.videoUrl);
  const hasAudio = Boolean(message.audio?.url);
  const hasPoll = Boolean(message.poll?.question && message.poll.options?.length >= 2);
  const canPin = !selectedGroup || selectedGroup.admins?.some((id) => String(id) === String(authUser?._id)) || String(selectedGroup.ownerId) === String(authUser?._id);
  const isDeleted = Boolean(message.deletedAt);
  const reactions = message.reactions || [];
  const reactionGroups = reactions.reduce((groups, reaction) => {
    const group = groups.find((item) => item.emoji === reaction.emoji);
    if (group) group.count += 1;
    else groups.push({ emoji: reaction.emoji, count: 1 });
    return groups;
  }, []);

  useEffect(() => {
    if (!isPickerOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsPickerOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isDeleteDropdownOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!deleteConfirmRef.current?.contains(event.target)) setIsDeleteDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDeleteDropdownOpen]);

  const handleReaction = async (emoji) => {
    setIsPickerOpen(false);
    await reactToMessage(message.id, emoji);
  };

  const handleDeleteForMe = async () => {
    const chatId = activeConversationId || (selectedGroup ? `group:${selectedGroup._id}` : message.receiverId || message.senderId);
    await deleteMessageForMe(message.id, chatId);
    setConfirmDeleteType(null);
    setIsMobileMenuOpen(false);
    setIsDeleteDropdownOpen(false);
  };

  const handleDeleteForEveryone = async () => {
    await deleteMessage(message.id);
    setConfirmDeleteType(null);
    setIsMobileMenuOpen(false);
    setIsDeleteDropdownOpen(false);
  };

  const pointerTimerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const composerText = useChatStore((state) => state.composerText);

  const handlePointerDown = (e) => {
    if (isMobileMenuOpen) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    setIsSwiping(true);
    pointerTimerRef.current = setTimeout(() => {
      setIsMobileMenuOpen(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    if (Math.abs(e.clientX - dragStartRef.current.x) > 10 || Math.abs(e.clientY - dragStartRef.current.y) > 10) {
      if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
    }
    const diff = e.clientX - dragStartRef.current.x;
    if (diff > 0) {
      setDragOffset(Math.min(diff, 80));
    }
  };

  const handlePointerUp = () => {
    if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
    if (dragOffset > 50) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      onReply?.();
    }
    setDragOffset(0);
    isDraggingRef.current = false;
    setIsSwiping(false);
  };

  const handlePointerCancel = () => {
    if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
    setDragOffset(0);
    isDraggingRef.current = false;
    setIsSwiping(false);
  };

  const handleCopyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      toast.success("Text copied to clipboard");
    }
    setIsMobileMenuOpen(false);
  };

  const handleMentionSender = () => {
    if (message.senderId && message.senderName) {
      const tag = `@[${message.senderName}](${message.senderId}) `;
      setComposerText((composerText ? composerText + " " : "") + tag);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div
      className={`group relative flex w-full flex-col ${isOwnMessage ? "items-end" : "items-start"} ${!isDeleted && reactionGroups.length > 0 ? "mb-3.5 sm:mb-4" : "mb-0.5"}`}
      data-message-id={message.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      style={{
        transform: `translateX(${dragOffset}px)`,
        touchAction: 'pan-y',
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        isolation: 'isolate',
      }}
    >
      <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
        {!isOwnMessage && (
            <Avatar className="size-8 shrink-0 self-end mr-2">
                <Avatar.Image alt={message.senderName} src={getOptimizedMediaUrl(message.senderPic, "avatar")} />
                <Avatar.Fallback className="text-xs">{getInitials(message.senderName || "User")}</Avatar.Fallback>
            </Avatar>
        )}
        {/* Swiping Indicator */}
        {dragOffset > 0 && (
            <div className="absolute -left-10 flex items-center justify-center opacity-100">
                <CornerUpLeftIcon className="size-6 text-accent" />
            </div>
        )}
        <div
          className={`relative break-words min-w-0 ${
            message.status === "sending" ? "opacity-75 transition-opacity" : ""
          } ${
            hasPoll
              ? "w-full max-w-[min(90vw,24rem)] sm:max-w-[min(85vw,26rem)]"
              : `w-fit max-w-[80%] rounded-[18px] px-3 py-2 text-[14px] leading-relaxed sm:max-w-[70%] sm:px-3.5 ${
                  isOwnMessage
                    ? "rounded-br-md bg-accent text-accent-foreground"
                    : "rounded-bl-md bg-surface"
                }`
          }`}
        >
        <div className={`absolute top-1/2 z-20 gap-0.5 rounded-xl border border-border/70 bg-background/95 p-0.5 shadow-sm ${isOwnMessage ? "right-full mr-1" : "left-full ml-1"} -translate-y-1/2 hidden sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100`} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full border border-border bg-background/95 text-muted shadow-sm transition-colors hover:text-foreground"
            aria-label="Reply to message"
            title="Reply to message"
            onClick={(event) => {
              event.stopPropagation();
              onReply?.();
            }}
          >
            <CornerUpLeftIcon className="size-4" aria-hidden />
          </button>
          {!isDeleted ? (
              <div ref={pickerRef}>
                <button
                  type="button"
                  className={`flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-foreground focus-visible:opacity-100 ${
                    isPickerOpen ? "opacity-100" : ""
                  }`}
                  aria-label="Add reaction"
                  title="Add reaction"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPickerOpen((open) => !open);
                  }}
                >
                  <SmilePlusIcon className="size-4" aria-hidden />
                </button>
                {isPickerOpen ? (
                  <div className={`absolute bottom-10 ${isOwnMessage ? "right-0" : "left-0"} z-30 flex max-w-[calc(100vw-1rem)] gap-0.5 rounded-xl border border-border bg-background p-1.5 shadow-lg`}>
                    {REACTION_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft"
                        aria-label={`React with ${emoji}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReaction(emoji);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isOwnMessage && !isDeleted && !message.poll && message.text ? (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-foreground"
                aria-label="Edit message"
                title="Edit message"
                onClick={(event) => {
                  event.stopPropagation();
                  startEditingMessage(message);
                }}
              >
                <PencilIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}

            {!isDeleted ? (
              <div className="relative">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete message"
                  title="Delete message"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDeleteDropdownOpen((open) => !open);
                  }}
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                </button>
                {isDeleteDropdownOpen ? (
                  <div
                    ref={deleteConfirmRef}
                    className="absolute right-0 top-8 z-30 flex min-w-40 flex-col gap-1 rounded-xl border border-border bg-background p-1.5 text-xs shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Delete message</span>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-foreground hover:bg-surface"
                      onClick={() => setConfirmDeleteType("me")}
                    >
                      <Trash2Icon className="size-3.5 text-muted" />
                      <span>Delete for me</span>
                    </button>
                    {isOwnMessage && (
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-medium text-danger hover:bg-danger/10"
                        onClick={() => setConfirmDeleteType("everyone")}
                      >
                        <Trash2Icon className="size-3.5" />
                        <span>Delete for everyone</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="mt-0.5 rounded-lg border border-border/50 py-1 text-center text-muted hover:bg-surface"
                      onClick={() => setIsDeleteDropdownOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {canPin && !isDeleted ? (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                title={message.isPinned ? "Unpin message" : "Pin message"}
                onClick={(event) => { event.stopPropagation(); pinMessage(message.id, !message.isPinned); }}
              >
                <PinIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
        </div>
        {message.replyTo ? (
          <button
            type="button"
            className="mb-1.5 block w-full rounded-lg border-l-2 border-accent/70 bg-background/25 px-2 py-1 text-left"
            onClick={(event) => {
              event.stopPropagation();
              onNavigateToReply?.(message.replyTo.id);
            }}
            aria-label={`Jump to message from ${message.replyTo.senderName}`}
          >
            <span className="block truncate text-xs font-semibold opacity-80">
              {message.replyTo.senderName}
            </span>
            <span className="block truncate text-xs opacity-70">
              {message.replyTo.deletedAt
                ? "Message deleted"
                : message.replyTo.text || (message.replyTo.imageUrl ? "📷 Image" : message.replyTo.videoUrl ? "🎥 Video" : message.replyTo.audio ? "🎙️ Voice message" : "Message")}
            </span>
          </button>
        ) : null}
        {isDeleted ? (
          <p className="italic text-muted">Message deleted</p>
        ) : (
          <>
            {message.isPinned ? <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-75"><PinIcon className="size-3" /> Pinned</p> : null}
            {hasImage ? (
              <div className="mb-1.5 overflow-hidden rounded-xl">
                <img
                  src={getOptimizedMediaUrl(message.imageUrl, "thumbnail")}
                  alt=""
                  className="max-h-40 max-w-full object-cover sm:max-h-52 cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.99]"
                  onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(true); }}
                />
              </div>
            ) : null}
            {isImageViewerOpen ? (
              <ImageViewerModal
                imageUrl={message.imageUrl}
                alt={message.text || "Image attachment"}
                onClose={() => setIsImageViewerOpen(false)}
              />
            ) : null}
            {hasVideo ? <MessageVideo src={message.videoUrl} /> : null}
            {hasAudio ? <MessageAudio audio={message.audio} /> : null}
            {hasPoll ? <PollCard poll={message.poll} isOwnMessage={isOwnMessage} onVote={(index) => votePoll(message.id, index)} onClose={() => closePoll(message.id)} /> : null}
            {message.text ? (
              <p className="whitespace-pre-wrap wrap-break-word">{renderFormattedMessage(message.text, isOwnMessage)}</p>
            ) : null}
          </>
        )}
        {!isDeleted && reactionGroups.length > 0 ? (
          <div
            className={`absolute -bottom-3 z-10 flex max-w-[92%] flex-wrap gap-1 ${
              isOwnMessage ? "right-2 justify-end" : "left-2 justify-start"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            {reactionGroups.map(({ emoji, count }) => {
              const isCurrentUserReaction = reactions.some(
                (reaction) =>
                  reaction.emoji === emoji &&
                  String(reaction.userId?._id || reaction.userId?.id || reaction.userId) === String(authUser?._id),
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none shadow-md backdrop-blur-xs transition-transform hover:scale-105 ${
                    isCurrentUserReaction
                      ? "border-accent/60 bg-accent-soft text-foreground"
                      : "border-border bg-surface text-foreground"
                  }`}
                  aria-label={`${emoji} reaction, ${count}. Click to view who reacted.`}
                  title="View who reacted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReactionModalEmoji(emoji);
                    setIsReactionDetailsOpen(true);
                  }}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-medium">{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {isReactionDetailsOpen ? (
          <ReactionDetailsModal
            isOpen={isReactionDetailsOpen}
            onClose={() => setIsReactionDetailsOpen(false)}
            reactions={reactions}
            initialEmoji={reactionModalEmoji}
            onReact={handleReaction}
          />
        ) : null}
        <p
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] tabular-nums ${
            isOwnMessage ? "text-accent-foreground/75" : "text-muted"
          }`}
        >
          {message.time}
          {message.editedAt ? <span aria-label="Edited">· edited</span> : null}
          {isOwnMessage ? (
            message.status === "sending" ? (
              <ClockIcon className="size-3 text-accent-foreground/60 animate-pulse" aria-label="Sending" />
            ) : message.status === "error" ? (
              <AlertCircleIcon className="size-3 text-danger" aria-label="Failed to send" />
            ) : (
              <span
                className={message.readAt ? "text-accent-foreground" : ""}
                aria-label={message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}
              >
                {message.deliveredAt ? "✓✓" : "✓"}
              </span>
            )
          ) : null}
        </p>
      </div>
      </div>

      {/* Unified Deletion Confirmation Modal */}
      {confirmDeleteType && typeof document !== "undefined" && document.body && (
        createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl animate-in zoom-in-95 duration-150">
                <h3 className="text-lg font-semibold mb-2">
                    {confirmDeleteType === "me" ? "Delete message for yourself?" : "Delete for everyone?"}
                </h3>
                <p className="text-muted text-sm mb-6">
                    {confirmDeleteType === "me"
                        ? "This message will be removed from your chat history on this device."
                        : "This will permanently delete the message for everyone in this conversation."}
                </p>
                <div className="flex gap-3">
                    <button type="button" className="flex-1 rounded-xl bg-surface py-2.5 font-medium hover:bg-surface/80" onClick={() => setConfirmDeleteType(null)}>Cancel</button>
                    <button type="button" className="flex-1 rounded-xl bg-danger py-2.5 font-medium text-white hover:bg-danger/90" onClick={confirmDeleteType === "me" ? handleDeleteForMe : handleDeleteForEveryone}>Delete</button>
                </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Mobile Context Menu Overlay via React Portal */}
      {isMobileMenuOpen && typeof document !== "undefined" && document.body && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMobileMenuOpen(false);
              setIsDeleteDropdownOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-xs space-y-3 rounded-2xl border border-border bg-background p-3 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {confirmDeleteType ? (
              <div className="space-y-3 p-2">
                <p className="text-center font-medium">
                  {confirmDeleteType === "me" ? "Delete message for yourself?" : "Delete for everyone?"}
                </p>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-lg bg-surface py-2 hover:bg-surface/80" onClick={() => setConfirmDeleteType(null)}>Cancel</button>
                  <button type="button" className="flex-1 rounded-lg bg-danger py-2 text-white hover:bg-danger/90 font-medium" onClick={confirmDeleteType === "me" ? handleDeleteForMe : handleDeleteForEveryone}>Delete</button>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Emoji Reaction Bar */}
                {!isDeleted && (
                  <div className="flex justify-between rounded-xl bg-surface p-1.5 shadow-inner">
                    {REACTION_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex size-9 items-center justify-center rounded-lg text-xl transition-transform active:scale-125 hover:bg-accent-soft"
                        onClick={() => {
                            handleReaction(emoji);
                            setIsMobileMenuOpen(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Action Menu */}
                <div className="flex flex-col divide-y divide-border/50 rounded-xl bg-surface text-sm">
                    <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={() => { setIsMobileMenuOpen(false); onReply?.(); }}>
                        <CornerUpLeftIcon className="size-4 text-accent" /> Reply
                    </button>
                    {message.text && (
                        <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={handleCopyText}>
                            <CopyIcon className="size-4 text-muted" /> Copy Text
                        </button>
                    )}
                    {selectedGroup && !isOwnMessage && (
                        <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={handleMentionSender}>
                            <AtSignIcon className="size-4 text-accent" /> Mention User
                        </button>
                    )}
                    {canPin && !isDeleted && (
                        <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={() => { pinMessage(message.id, !message.isPinned); setIsMobileMenuOpen(false); }}>
                            <PinIcon className="size-4 text-accent" /> {message.isPinned ? "Unpin Message" : "Pin Message"}
                        </button>
                    )}
                    {isOwnMessage && !isDeleted && !message.poll && message.text && (
                        <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={() => { setIsMobileMenuOpen(false); startEditingMessage(message); }}>
                            <PencilIcon className="size-4 text-muted" /> Edit Message
                        </button>
                    )}
                    {!isDeleted && (
                        <>
                            <button
                              type="button"
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium text-danger hover:bg-danger/10"
                              onClick={() => setConfirmDeleteType("me")}
                            >
                              <Trash2Icon className="size-4" /> Delete for Me
                            </button>
                            {isOwnMessage && (
                              <button
                                type="button"
                                className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium text-danger hover:bg-danger/10"
                                onClick={() => setConfirmDeleteType("everyone")}
                              >
                                <Trash2Icon className="size-4" /> Delete for Everyone
                              </button>
                            )}
                        </>
                    )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
