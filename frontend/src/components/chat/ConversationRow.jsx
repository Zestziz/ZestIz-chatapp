import { useState, useRef, useEffect, memo } from "react";
import { Avatar, Button } from "@heroui/react";
import { MoreVertical, Trash2 } from "lucide-react";
import { DeleteConversationModal } from "./DeleteConversationModal";
import { useChatStore } from "../../store/useChatStore";
import { useLongPress } from "../../hooks/useLongPress";
import { getOptimizedMediaUrl } from "../../lib/imagekit";

export const ConversationRow = memo(function ConversationRow({ user, selected, onSelect, onProfile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  const deleteConversation = useChatStore((state) => state.deleteConversation);

  const longPress = useLongPress(
    () => {
      if (!user.isGroup) {
        setIsDeleteModalOpen(true);
      }
    },
    onSelect,
    { delay: 750, moveThreshold: 10 }
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteConversation(user._id || user.id);
      if (success) {
        setIsDeleteModalOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const avatarSrc = getOptimizedMediaUrl(
    user.avatarUrl || user.profilePic || user.avatar || user.imageUrl,
    "avatar"
  );

  return (
    <>
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

          {/* 1-on-1 Action menu */}
          {!user.isGroup && (
            <div
              ref={menuRef}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="light"
                isIconOnly
                aria-label="Conversation options"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity size-7 text-muted hover:text-foreground rounded-full"
                onPress={() => setIsMenuOpen((prev) => !prev)}
              >
                <MoreVertical className="size-4" />
              </Button>

              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Conversation</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        userName={user.name}
        isLoading={isDeleting}
      />
    </>
  );
});
