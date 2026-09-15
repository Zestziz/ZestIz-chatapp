import { memo } from "react";
import { Avatar, Button } from "@heroui/react";
import { MoreVertical } from "lucide-react";
import { useLongPress } from "../../hooks/useLongPress";
import { getOptimizedMediaUrl } from "../../lib/imagekit";

export const ConversationRow = memo(function ConversationRow({
  user,
  selected,
  onSelect,
  onProfile,
  onDelete,
}) {
  const longPress = useLongPress(
    () => {
      onDelete?.(user);
    },
    onSelect,
    { delay: 750, moveThreshold: 10 }
  );

  const avatarSrc = getOptimizedMediaUrl(
    user.avatarUrl || user.profilePic || user.avatar || user.imageUrl,
    "avatar"
  );

  return (
    <div
      role="button"
      tabIndex={0}
      {...longPress.handlers}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors cursor-pointer select-none sm:px-4 zestiz-conversation-list ${
        selected ? "bg-accent-soft/75" : "hover:bg-surface/70"
      }`}
    >
      <div
        onClick={(event) => {
          event.stopPropagation();
          onProfile?.();
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
        }}
      >
        <Avatar className="size-11 shrink-0">
          <Avatar.Image
            alt={user.name}
            src={avatarSrc}
          />
          <Avatar.Fallback className="text-sm font-medium">
            {user.initials}
          </Avatar.Fallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">
          {user.isGroup ? "Group · " : ""}
          {user.name}
        </p>
        {user.lastMessage ? (
          <p className="truncate text-[12px] text-muted">
            {user.lastMessage.deletedAt
              ? "Message deleted"
              : user.lastMessage.text ||
                (user.lastMessage.poll
                  ? "Poll"
                  : user.lastMessage.image
                    ? "Photo"
                    : user.lastMessage.video
                      ? "Video"
                      : user.lastMessage.audio
                        ? "Voice message"
                        : "Message")}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {user.unreadCount > 0 ? (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
            {user.unreadCount > 99 ? "99+" : user.unreadCount}
          </span>
        ) : null}

        {/* Delete action */}
        <button
          type="button"
          aria-label={user.isGroup ? "Clear chat" : "Delete conversation"}
          className="relative z-20 pointer-events-auto opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 text-muted hover:text-foreground hover:bg-surface/80 rounded-full"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(user);
          }}
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
});
