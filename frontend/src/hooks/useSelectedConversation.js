import { useMediaQuery } from "./useMediaQuery";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";

// John Doe -> JD
export function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join("");
}

// mapUserToConversation is an adapter — it converts the raw backend shapes (a user document + an array of message documents) into the clean view-model that the chat UI components expect to render.

// Two transformations happen:
// 1. Messages → UI messages
// 2. User → peer

function mapUserToConversation({ user, messages, authUser, onlineUsers, lastSeenByUser }) {
  const mappedMessages = messages.map((message) => {
    const isOwn = String(message.senderId) === String(authUser?._id);
    return {
      id: message._id,
      senderId: message.senderId,
      role: isOwn ? "me" : "them",
      senderName: isOwn ? "You" : user.fullName,
      senderPic: isOwn ? authUser?.profilePic : user.profilePic,
      text: message.text || "",
      time: formatMessageTime(message.createdAt),
      imageUrl: message.image,
      videoUrl: message.video,
      audio: message.audio || null,
      poll: message.poll || null,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      deletedBy: message.deletedBy,
      isPinned: message.isPinned || false,
      pinnedAt: message.pinnedAt,
      reactions: message.reactions || [],
      replyTo: message.replyTo && typeof message.replyTo === "object"
        ? {
            id: message.replyTo._id,
            senderName:
              String(message.replyTo.senderId) === String(authUser?._id) ? "You" : user.fullName,
            text: message.replyTo.text || "",
            imageUrl: message.replyTo.image,
            videoUrl: message.replyTo.video,
            audio: message.replyTo.audio,
            poll: message.replyTo.poll,
            deletedAt: message.replyTo.deletedAt,
          }
        : null,
    };
  });

  return {
    id: user._id,
    peer: {
      name: user.fullName,
      username: user.username,
      subtitle: user.email,
      isOnline: onlineUsers.includes(user._id),
      lastSeen: lastSeenByUser[user._id] ?? user.lastSeen,
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
    },
    messages: mappedMessages,
  };
}

function mapGroupToConversation({ group, messages, authUser }) {
  const mappedMessages = messages.map((message) => {
    const isOwn = String(message.senderId) === String(authUser?._id);
    const sender = group.members?.find((member) => String(member._id) === String(message.senderId));
    const senderName = isOwn ? "You" : sender?.fullName || "Member";
    const senderPic = isOwn ? authUser?.profilePic : sender?.profilePic;
    return {
      id: message._id,
      senderId: message.senderId,
      role: isOwn ? "me" : "them",
      senderName,
      senderPic,
      text: message.text || "",
      time: formatMessageTime(message.createdAt),
      imageUrl: message.image,
      videoUrl: message.video,
      audio: message.audio || null,
      poll: message.poll || null,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      deletedBy: message.deletedBy,
      isPinned: message.isPinned || false,
      pinnedAt: message.pinnedAt,
      reactions: message.reactions || [],
      replyTo: message.replyTo && typeof message.replyTo === "object" ? {
        id: message.replyTo._id,
        senderName: String(message.replyTo.senderId) === String(authUser?._id) ? "You" : group.members?.find((member) => String(member._id) === String(message.replyTo.senderId))?.fullName || "Member",
        text: message.replyTo.text || "",
        imageUrl: message.replyTo.image,
        videoUrl: message.replyTo.video,
        audio: message.replyTo.audio,
        poll: message.replyTo.poll,
        deletedAt: message.replyTo.deletedAt,
      } : null,
    };
  });
  return {
    id: `group:${group._id}`,
    isGroup: true,
    group,
    peer: { name: group.name, avatarUrl: group.profilePic, initials: getInitials(group.name), memberCount: group.members?.length || 0 },
    messages: mappedMessages,
  };
}

export function useSelectedConversation() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const groups = useChatStore((state) => state.groups);
  const users = useChatStore((state) => state.users);
  const messages = useChatStore((state) => state.messages);
  const friends = useFriendStore((state) => state.friends);

  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const lastSeenByUser = useAuthStore((state) => state.lastSeenByUser);

  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const selectedUser = activeConversationId
    ? users.find((user) => user._id === activeConversationId) ||
      conversations.find((user) => user._id === activeConversationId) ||
      friends.find((user) => user._id === activeConversationId)
    : null;
  const selectedGroup = activeConversationId?.startsWith("group:")
    ? groups.find((group) => String(group._id) === activeConversationId.slice(6))
    : null;

  const activeConversation = selectedGroup
    ? mapGroupToConversation({ group: selectedGroup, messages, authUser })
    : selectedUser
      ? mapUserToConversation({ user: selectedUser, messages, authUser, onlineUsers, lastSeenByUser })
      : null;

  return {
    activeConversation,
    activeConversationId,
    isLargeScreen,
  };
}