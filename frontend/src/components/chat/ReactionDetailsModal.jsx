import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Smile } from "lucide-react";
import { Avatar } from "@heroui/react";
import { getOptimizedMediaUrl } from "../../lib/imagekit";
import { getInitials } from "../../hooks/useSelectedConversation";
import { useAuthStore } from "../../store/useAuthStore";

export function ReactionDetailsModal({
  isOpen,
  onClose,
  reactions = [],
  onReact,
  initialEmoji = "all",
}) {
  const [selectedTab, setSelectedTab] = useState(() => initialEmoji || "all");
  const authUser = useAuthStore((state) => state.authUser);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined" || !document.body) return null;

  // Group reactions by emoji
  const emojiGroups = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = [];
    }
    acc[r.emoji].push(r);
    return acc;
  }, {});

  const distinctEmojis = Object.keys(emojiGroups);

  const filteredReactions =
    selectedTab === "all"
      ? reactions
      : reactions.filter((r) => r.emoji === selectedTab);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reaction details"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-md text-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Smile className="size-4 text-accent" />
            <h3 className="font-semibold text-sm">
              Reactions ({reactions.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:bg-surface hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        {distinctEmojis.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none border-b border-border/40">
            <button
              type="button"
              onClick={() => setSelectedTab("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                selectedTab === "all"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              All {reactions.length}
            </button>
            {distinctEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedTab(emoji)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
                  selectedTab === emoji
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                <span>{emoji}</span>
                <span>{emojiGroups[emoji]?.length || 0}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reaction List */}
        <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-border/30 space-y-0.5 pr-0.5">
          {filteredReactions.map((reaction, index) => {
            const user =
              typeof reaction.userId === "object" && reaction.userId !== null
                ? reaction.userId
                : null;
            const userId = user?._id || user?.id || reaction.userId;
            const isSelf = String(userId) === String(authUser?._id);
            const displayName = user?.fullName || (isSelf ? "You" : "User");
            const username = user?.username ? `@${user.username}` : "";
            const profilePic = user?.profilePic || "";

            return (
              <div
                key={`${userId}-${reaction.emoji}-${index}`}
                className="flex items-center justify-between py-2 px-1.5 rounded-xl hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-8 shrink-0">
                    <Avatar.Image
                      alt={displayName}
                      src={getOptimizedMediaUrl(profilePic, "avatar")}
                    />
                    <Avatar.Fallback className="text-xs">
                      {getInitials(displayName)}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate flex items-center gap-1">
                      <span>{displayName}</span>
                      {isSelf && (
                        <span className="text-[10px] text-accent font-normal">
                          (You)
                        </span>
                      )}
                    </p>
                    {username && (
                      <p className="text-[11px] text-muted truncate">
                        {username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="text-base">{reaction.emoji}</span>
                  {isSelf && onReact && (
                    <button
                      type="button"
                      onClick={() => onReact(reaction.emoji)}
                      className="text-[10px] text-muted hover:text-danger px-1.5 py-0.5 rounded bg-surface hover:bg-danger/10 transition-colors"
                      title="Remove reaction"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
