import { Avatar } from "@heroui/react";

export function ConversationRow({ user, selected, onSelect, onProfile }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors sm:px-4 ${
        selected ? "bg-accent-soft/75" : "hover:bg-surface/70"
      }`}
    >
      <div onClick={(event) => { event.stopPropagation(); onProfile?.(); }}>
        <Avatar className="size-11 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">{user.initials}</Avatar.Fallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{user.isGroup ? "Group · " : ""}{user.name}</p>
        {user.lastMessage ? (
            <p className="truncate text-[12px] text-muted">
            {user.lastMessage.deletedAt
              ? "Message deleted"
              : user.lastMessage.text || (user.lastMessage.poll ? "Poll" : user.lastMessage.image ? "Photo" : user.lastMessage.video ? "Video" : user.lastMessage.audio ? "Voice message" : "Message")}
          </p>
        ) : null}
      </div>
      {user.unreadCount > 0 ? (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
          {user.unreadCount > 99 ? "99+" : user.unreadCount}
        </span>
      ) : null}
    </button>
  );
}