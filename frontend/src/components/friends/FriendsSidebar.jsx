import { useEffect } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";
import { Avatar, Button } from "@heroui/react";
import { MessageSquare, UserMinus } from "lucide-react";
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
    <div className="px-4 pb-4">
      <h2 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wider">My Friends</h2>

      {friends.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">You have no friends yet.</p>
      )}

      <ul className="space-y-4">
        {friends.map((f) => (
          <li key={f._id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <AvatarWithOnlineIndicator isOnline={onlineUsers.includes(f._id)}>
                <Avatar src={f.profilePic} name={getInitials(f.fullName)} size="md" />
              </AvatarWithOnlineIndicator>
              <div>
                <p className="text-sm font-semibold">{f.fullName}</p>
                <button
                  className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  onMouseEnter={() => getMutualCount(f._id)}
                  onFocus={() => getMutualCount(f._id)}
                >
                  {mutualCounts[f._id] != null
                    ? `${mutualCounts[f._id]} mutual friends`
                    : "Hover to see mutuals"}
                </button>
              </div>
            </div>

            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleMessage(f._id)}>
                <MessageSquare className="size-4" />
              </Button>
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => removeFriend(f._id)}>
                <UserMinus className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
