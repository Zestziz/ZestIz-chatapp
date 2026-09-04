import { useEffect, useRef, useState } from "react";
import { Avatar } from "@heroui/react";
import { BarChart3Icon, CornerUpLeftIcon, PencilIcon, PinIcon, SmilePlusIcon, Trash2Icon, MoreHorizontalIcon, CopyIcon, AtSignIcon } from "lucide-react";
import { withTransform } from "../../lib/imagekit";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { MessageVideo } from "./MessageVideo";
import { MessageAudio } from "./MessageAudio";
import { PollCard } from "./PollCard";
import { getInitials } from "../../hooks/useSelectedConversation";
import toast from "react-hot-toast";

// Compress + size images for the bubble (q-auto works for images; f-auto picks WebP/AVIF).
const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";
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

export function MessageBubble({ message, onReply, onNavigateToReply }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pickerRef = useRef(null);
  const moreRef = useRef(null);
  const authUser = useAuthStore((state) => state.authUser);
  const reactToMessage = useChatStore((state) => state.reactToMessage);
  const startEditingMessage = useChatStore((state) => state.startEditingMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
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

  const handleReaction = async (emoji) => {
    setIsPickerOpen(false);
    await reactToMessage(message.id, emoji);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
    setIsDeleteConfirmOpen(false);
  };

  const pointerTimerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const composerText = useChatStore((state) => state.composerText);

  const handlePointerDown = (e) => {
    // Don't start long-press if a mobile menu is already open
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
      className={`group relative flex w-full flex-col ${isOwnMessage ? "items-end" : "items-start"} ${!message.deletedAt && message.reactions?.length ? "mb-5" : ""}`}
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
      }}
    >
      <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
        {!isOwnMessage && (
            <Avatar className="size-8 shrink-0 self-end mr-2">
                <Avatar.Image alt={message.senderName} src={message.senderPic} />
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
            hasPoll
              ? "w-full max-w-[min(90vw,24rem)] sm:max-w-[min(85vw,26rem)]"
              : `w-fit max-w-[80%] rounded-[18px] px-3 py-2 text-[14px] leading-relaxed sm:max-w-[70%] sm:px-3.5 ${
                  isOwnMessage
                    ? "rounded-br-md bg-accent text-accent-foreground"
                    : "rounded-bl-md bg-surface"
                }`
          }`}
        >
        <div className={`absolute top-1/2 z-20 gap-0.5 rounded-xl border border-border/70 bg-background/95 p-0.5 shadow-sm ${isOwnMessage ? "right-full mr-1" : "left-full ml-1"} -translate-y-1/2 ${isActionsOpen ? "flex" : "hidden sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"}`} onClick={(event) => event.stopPropagation()}>
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
            {isOwnMessage && !isDeleted ? (
              <>
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
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete message"
                  title="Delete message"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                </button>
              </>
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
            {isDeleteConfirmOpen ? (
              <div className="absolute right-0 top-8 flex items-center gap-1 rounded-lg border border-border bg-background p-1.5 text-xs shadow-lg">
                <span className="px-1 text-muted">Delete for everyone?</span>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-muted hover:bg-surface"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-danger px-2 py-1 text-white"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
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
              <img
                src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
                alt=""
                className="mb-1.5 max-h-40 max-w-full rounded-lg object-cover sm:max-h-52 sm:rounded-xl"
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
          <div className={`absolute -bottom-4 z-10 flex max-w-[92%] flex-wrap gap-1 ${isOwnMessage ? "right-2 justify-end" : "left-2 justify-start"}`} onClick={(event) => event.stopPropagation()}>
            {reactionGroups.map(({ emoji, count }) => {
              const isCurrentUserReaction = reactions.some(
                (reaction) =>
                  reaction.emoji === emoji &&
                  String(reaction.userId) === String(authUser?._id),
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`rounded-full border px-1.5 py-0.5 text-xs leading-none ${
                    isCurrentUserReaction
                      ? "border-accent/60 bg-accent-soft shadow-sm"
                      : "border-border bg-background/95 shadow-sm"
                  }`}
                  aria-label={`${emoji} reaction, ${count}`}
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji} {count}
                </button>
              );
            })}
          </div>
        ) : null}
        <p
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] tabular-nums ${
            isOwnMessage ? "text-accent-foreground/75" : "text-muted"
          }`}
        >
          {message.time}
          {message.editedAt ? <span aria-label="Edited">· edited</span> : null}
          {isOwnMessage ? (
            <span
              className={message.readAt ? "text-accent-foreground" : ""}
              aria-label={message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}
            >
              {message.deliveredAt ? "✓✓" : "✓"}
            </span>
          ) : null}
        </p>
      </div>
      </div>

      {/* Mobile Context Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
          }}
        >
          <div
            className="w-full max-w-xs space-y-3 rounded-2xl border border-border bg-background p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isDeleteConfirmOpen ? (
              <div className="space-y-3 p-2">
                <p className="text-center font-medium">Delete for everyone?</p>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-lg bg-surface py-2 hover:bg-surface/80" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
                  <button type="button" className="flex-1 rounded-lg bg-danger py-2 text-white hover:bg-danger/90" onClick={handleDelete}>Delete</button>
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
                    {isOwnMessage && !isDeleted && (
                        <>
                            {!message.poll && !message.imageUrl && !message.videoUrl && !message.audio && (
                                <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium hover:bg-accent-soft" onClick={() => { setIsMobileMenuOpen(false); startEditingMessage(message); }}>
                                    <PencilIcon className="size-4 text-muted" /> Edit Message
                                </button>
                            )}
                            <button type="button" className="flex items-center gap-2.5 px-3.5 py-2.5 text-left font-medium text-danger hover:bg-danger/10" onClick={() => { setIsDeleteConfirmOpen(true); }}>
                                <Trash2Icon className="size-4" /> Delete Message
                            </button>
                        </>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}