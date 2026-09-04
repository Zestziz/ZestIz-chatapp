import { Avatar, Button } from "@heroui/react";
import { UserPlus, Clock, Check, X, UserMinus } from "lucide-react";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";
import { useFriendStore } from "../../store/useFriendStore";

export function UserRow({ user, selected, onSelect, onProfile }) {
  const friends = useFriendStore((state) => state.friends);
  const incomingRequests = useFriendStore((state) => state.incomingRequests);
  const outgoingRequests = useFriendStore((state) => state.outgoingRequests);

  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const acceptRequest = useFriendStore((state) => state.acceptRequest);
  const rejectRequest = useFriendStore((state) => state.rejectRequest);
  const cancelRequest = useFriendStore((state) => state.cancelRequest);
  const removeFriend = useFriendStore((state) => state.removeFriend);

  const isFriend = friends.some((f) => f._id === user.id);
  const isPendingOutgoing = outgoingRequests.some((r) => r.receiver._id === user.id);
  const incomingRequest = incomingRequests.find((r) => r.sender._id === user.id);

  const handleAction = (e) => {
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors sm:px-4 ${
        selected ? "bg-accent-soft/75" : "hover:bg-surface/70"
      }`}
    >
      <AvatarWithOnlineIndicator isOnline={user.isOnline ?? false} onClick={(event) => { event.stopPropagation(); onProfile?.(); }}>
        <Avatar className="size-11 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">{user.initials}</Avatar.Fallback>
        </Avatar>
      </AvatarWithOnlineIndicator>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{user.name}</p>
      </div>

      <div className="flex items-center gap-1" onClick={handleAction}>
        {isFriend ? (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            className="gap-1"
            onPress={() => removeFriend(user.id)}
          >
            <UserMinus className="size-4" /> Unfriend
          </Button>
        ) : incomingRequest ? (
          <>
            <Button isIconOnly size="sm" color="success" variant="flat" onPress={() => acceptRequest(user.id)}>
              <Check className="size-4" />
            </Button>
            <Button isIconOnly size="sm" color="danger" variant="flat" onPress={() => rejectRequest(user.id)}>
              <X className="size-4" />
            </Button>
          </>
        ) : isPendingOutgoing ? (
          <Button size="sm" variant="flat" color="default" className="gap-1" onPress={() => cancelRequest(user.id)}>
            <Clock className="size-4" /> Pending
          </Button>
        ) : (
          <Button size="sm" variant="flat" color="primary" className="gap-1" onPress={() => sendFriendRequest(user.id)}>
            <UserPlus className="size-4" /> Add
          </Button>
        )}
      </div>
    </button>
  );
}
