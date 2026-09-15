import { useEffect } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { MessageSquare, UserMinus, Users, MoreVertical } from "lucide-react";
import { AvatarWithOnlineIndicator } from "../chat/AvatarWithOnlineIndicator";
import { useAuthStore } from "../../store/useAuthStore";
import { getInitials } from "../../hooks/useSelectedConversation";

export default function FriendsSidebar() {
  const friends = useFriendStore((state) => state.friends);
  const getFriends = useFriendStore((state) => state.getFriends);
  const removeFriend = useFriendStore((state) => state.removeFriend);
  const mutualCounts = useFriendStore((state) => state.mutualCounts);
  const getMutualCount = useFriendStore((state) => state.getMutualCount);

  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  useEffect(() => {
    getFriends();
  }, [getFriends]);

  const handleMessage = (friendId) => {
    setActiveConversationId(friendId);
  };

  return (
    <div className="px-4 pb-4 pt-4">
      <h2 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wider">My Friends</h2>

      {friends.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">You have no friends yet.</p>
      )}

      <ul className="space-y-2">
        {friends.map((f) => (
          <li key={f._id} className="flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-surface/50 transition-colors cursor-pointer select-none" onClick={() => handleMessage(f._id)}>
            <div className="flex items-center gap-3 w-full pr-2">
              <AvatarWithOnlineIndicator isOnline={onlineUsers.includes(f._id)}>
                <Avatar className="size-10 shrink-0 cursor-pointer">
                  <Avatar.Image
                    src={f.profilePic || f.avatar || f.imageUrl || f.avatarUrl}
                    alt={f.fullName}
                  />
                  <Avatar.Fallback className="text-sm font-medium">
                    {getInitials(f.fullName)}
                  </Avatar.Fallback>
                </Avatar>
              </AvatarWithOnlineIndicator>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{f.fullName}</p>
                <div
                  className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full bg-surface/80 border border-border/50 text-[10px] sm:text-[11px] text-muted-foreground hover:bg-surface hover:text-foreground hover:border-border transition-all cursor-pointer select-none"
                  onMouseEnter={() => getMutualCount(f._id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    getMutualCount(f._id);
                  }}
                >
                  <Users className="size-3" />
                  {mutualCounts[f._id] != null ? (
                    <span>{mutualCounts[f._id]} mutual{mutualCounts[f._id] !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>Check mutuals</span>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleMessage(f._id)} className="hidden sm:flex">
                <MessageSquare className="size-4" />
              </Button>
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => removeFriend(f._id)} className="hidden sm:flex">
                <UserMinus className="size-4" />
              </Button>

              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light" className="sm:hidden text-muted-foreground w-8 min-w-8">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Friend Actions">
                  <DropdownItem key="message" startContent={<MessageSquare className="size-4" />} onPress={() => handleMessage(f._id)}>
                    Message
                  </DropdownItem>
                  <DropdownItem key="unfriend" className="text-danger" color="danger" startContent={<UserMinus className="size-4" />} onPress={() => removeFriend(f._id)}>
                    Unfriend
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
