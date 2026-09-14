import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

function updateMessageReceipts(messages, messageIds, receipt) {
  const ids = new Set(messageIds.map(String));
  return messages.map((message) =>
    ids.has(String(message._id)) ? { ...message, ...receipt } : message,
  );
}

function updateMessageReactions(messages, messageId, reactions) {
  return messages.map((message) =>
    String(message._id) === String(messageId) ? { ...message, reactions } : message,
  );
}

function updateMessagePoll(messages, messageId, poll) {
  return messages.map((message) =>
    String(message._id) === String(messageId) ? { ...message, poll } : message,
  );
}

function updateMessagePin(messages, messageId, pin) {
  return messages.map((message) => String(message._id) === String(messageId) ? { ...message, ...pin } : message);
}

function incrementConversationUnread(conversations, userId) {
  return conversations.map((conversation) =>
    String(conversation._id) === String(userId)
      ? { ...conversation, unreadCount: (conversation.unreadCount || 0) + 1 }
      : conversation,
  );
}

function updateMessageFromServer(messages, updatedMessage) {
  return messages.map((message) => {
    if (String(message._id) === String(updatedMessage._id)) {
      return { ...message, ...updatedMessage };
    }
    if (String(message.replyTo?._id) === String(updatedMessage._id)) {
      return {
        ...message,
        replyTo: { ...message.replyTo, ...updatedMessage },
      };
    }
    return message;
  });
}

function markMessageDeleted(messages, messageId, deletedAt, deletedBy) {
  return messages.map((message) => {
    const deletedFields = {
      text: null,
      image: null,
      video: null,
      audio: null,
      reactions: [],
      deletedAt,
      deletedBy,
      isPinned: false,
    };
    if (String(message._id) === String(messageId)) {
      return { ...message, ...deletedFields };
    }
    if (String(message.replyTo?._id) === String(messageId)) {
      return { ...message, replyTo: { ...message.replyTo, ...deletedFields } };
    }
    return message;
  });
}

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      groups: [],
      messages: [],
      selectedUser: null,
      selectedGroup: null,
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      activeConversationId: null,
      searchQuery: "",
      sidebarTab: "chats",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,
      typingUsers: {},
      replyingTo: null,
      editingMessage: null,
      messageSearchQuery: "",
      searchResults: [],
      isSearchingMessages: false,
      searchTargetMessageId: null,
      searchRequestId: 0,
      profileUser: null,
      pinnedMessages: [],

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            selectedUser:
              state.selectedUser && res.data.some((user) => user._id === state.selectedUser._id)
                ? state.selectedUser
                : null,
          }));
        } catch (error) {
          console.log("Error in get Users", error.message);
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getConversations: async () => {
        set({ isConversationsLoading: true });
        try {
          const res = await axiosInstance.get("/messages/conversations");
          set({ conversations: res.data });
        } catch (error) {
          console.log("Error in getConversations", error.message);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      getGroups: async () => {
        try {
          const res = await axiosInstance.get("/groups");
          set({ groups: res.data });
        } catch (error) {
          console.log("Error in getGroups", error.message);
        }
      },

      getGroupMessages: async (groupId) => {
        if (!groupId) return;
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/groups/${groupId}/messages`);
          set({ messages: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load group messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      createGroup: async (formData) => {
        try {
          const res = await axiosInstance.post("/groups", formData);
          set((state) => ({ groups: [res.data, ...state.groups] }));
          return res.data;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to create group");
          return null;
        }
      },

      updateGroup: async (groupId, formData) => {
        try {
          const res = await axiosInstance.patch(`/groups/${groupId}`, formData);
          set((state) => {
            const updatedGroup = state.groups.find((group) => String(group._id) === String(groupId));
            const group = { ...updatedGroup, ...res.data };
            return {
              groups: state.groups.map((item) => String(item._id) === String(groupId) ? group : item),
              selectedGroup: state.selectedGroup && String(state.selectedGroup._id) === String(groupId) ? group : state.selectedGroup,
            };
          });
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update group");
          return false;
        }
      },

      updateGroupMembers: async (groupId, action, userId, options = {}) => {
        try {
          const res = await axiosInstance.post(`/groups/${groupId}/members`, { action, userId, ...options });
          set((state) => ({ groups: state.groups.map((group) => String(group._id) === String(groupId) ? { ...group, ...res.data } : group), selectedGroup: res.data }));
          if (action === "leave") set({ activeConversationId: null, selectedGroup: null, messages: [] });
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update group members");
          return false;
        }
      },

      updateGroupMemberRole: async (groupId, userId, role) => {
        try {
          const res = await axiosInstance.patch(`/groups/${groupId}/members/${userId}/role`, { role });
          set((state) => ({
            groups: state.groups.map((group) => String(group._id) === String(groupId) ? { ...group, ...res.data } : group),
            selectedGroup: res.data,
          }));
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update group role");
          return false;
        }
      },

      getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      openProfile: async (userId) => {
        try {
          const res = await axiosInstance.get(`/auth/profile/${userId}`);
          set({ profileUser: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load profile");
        }
      },
      closeProfile: () => set({ profileUser: null }),
      updateProfile: async (profileData) => {
        try {
          const res = await axiosInstance.patch("/auth/profile", profileData);
          set((state) => ({
            profileUser: res.data,
            users: state.users.map((user) => String(user._id) === String(res.data._id) ? { ...user, ...res.data } : user),
            conversations: state.conversations.map((user) => String(user._id) === String(res.data._id) ? { ...user, ...res.data } : user),
          }));
          useAuthStore.setState({ authUser: { ...useAuthStore.getState().authUser, ...res.data } });
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update profile");
          return false;
        }
      },

      markMessagesRead: async (userId) => {
        if (!userId) return;

        if (String(userId).startsWith("group:")) {
          const groupId = String(userId).slice(6);
          set((state) => ({
            groups: state.groups.map((group) => String(group._id) === groupId ? { ...group, unreadCount: 0 } : group),
          }));
          return;
        }

        try {
          const res = await axiosInstance.post(`/messages/${userId}/read`);
          if (res.data.messageIds?.length) {
            set((state) => ({
              messages: updateMessageReceipts(state.messages, res.data.messageIds, {
                readAt: res.data.readAt,
              }),
              conversations: state.conversations.map((conversation) =>
                String(conversation._id) === String(userId)
                  ? { ...conversation, unreadCount: 0 }
                  : conversation,
              ),
            }));
          } else {
            set((state) => ({
              conversations: state.conversations.map((conversation) =>
                String(conversation._id) === String(userId)
                  ? { ...conversation, unreadCount: 0 }
                  : conversation,
              ),
            }));
          }
        } catch (error) {
          console.log("Error marking messages read", error.message);
        }
      },

      reactToMessage: async (messageId, emoji) => {
        try {
          const res = await axiosInstance.post(`/messages/${messageId}/reaction`, { emoji });
          set((state) => ({
            messages: updateMessageReactions(state.messages, messageId, res.data.reactions),
          }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update reaction");
        }
      },

      createPoll: async (conversationId, question, options) => {
        const selectedGroup = get().selectedGroup;
        const target = selectedGroup ? `/groups/${selectedGroup._id}/poll` : `/messages/${conversationId}/poll`;
        try {
          const res = await axiosInstance.post(target, { question, options });
          set((state) => ({ messages: [...state.messages, res.data] }));
          selectedGroup ? get().getGroups() : get().getConversations();
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to create poll");
          return false;
        }
      },

      votePoll: async (messageId, optionIndex) => {
        try {
          const selectedGroup = get().selectedGroup;
          const target = selectedGroup ? `/groups/${selectedGroup._id}/poll/${messageId}/vote` : `/messages/${messageId}/poll/vote`;
          const res = await axiosInstance.post(target, { optionIndex });
          set((state) => ({ messages: updateMessagePoll(state.messages, messageId, res.data.poll) }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to vote");
        }
      },

      closePoll: async (messageId) => {
        try {
          const selectedGroup = get().selectedGroup;
          const target = selectedGroup ? `/groups/${selectedGroup._id}/poll/${messageId}/close` : `/messages/${messageId}/poll/close`;
          const res = await axiosInstance.patch(target);
          set((state) => ({ messages: updateMessagePoll(state.messages, messageId, res.data.poll) }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to close poll");
        }
      },

      pinMessage: async (messageId, pinned) => {
        try {
          const selectedGroup = get().selectedGroup;
          const target = selectedGroup ? `/groups/${selectedGroup._id}/messages/${messageId}/pin` : `/messages/${messageId}/pin`;
          const res = await axiosInstance.patch(target, { pinned });
          set((state) => ({
            messages: updateMessagePin(state.messages, messageId, res.data),
            pinnedMessages: pinned
              ? [...state.pinnedMessages.filter((message) => String(message._id) !== String(messageId)), { ...state.messages.find((message) => String(message._id) === String(messageId)), ...res.data }]
              : state.pinnedMessages.filter((message) => String(message._id) !== String(messageId)),
          }));
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to update pin");
          return false;
        }
      },

      getPinnedMessages: async (conversationId) => {
        try {
          const isGroup = String(conversationId).startsWith("group:");
          const id = isGroup ? String(conversationId).slice(6) : conversationId;
          const res = await axiosInstance.get(isGroup ? `/groups/${id}/pinned` : `/messages/pinned/${id}`);
          set({ pinnedMessages: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load pinned messages");
        }
      },

      searchMessages: async (userId, query) => {
        const normalizedQuery = query.trim();
        const requestId = get().searchRequestId + 1;
        set({
          messageSearchQuery: normalizedQuery,
          searchRequestId: requestId,
          searchResults: normalizedQuery ? get().searchResults : [],
          isSearchingMessages: Boolean(normalizedQuery),
        });
        if (!normalizedQuery) return;

        try {
          const isGroup = String(userId).startsWith("group:");
          const targetId = isGroup ? String(userId).slice(6) : userId;
          const res = await axiosInstance.get(isGroup ? `/groups/${targetId}/search` : `/messages/search/${targetId}`, {
            params: { q: normalizedQuery },
          });
          if (get().searchRequestId !== requestId) return;
          set({ searchResults: res.data, isSearchingMessages: false });
        } catch (error) {
          if (get().searchRequestId === requestId) {
            set({ searchResults: [], isSearchingMessages: false });
            console.log("Error searching messages", error.message);
          }
        }
      },
      clearMessageSearch: () =>
        set((state) => ({
          messageSearchQuery: "",
          searchResults: [],
          isSearchingMessages: false,
          searchTargetMessageId: null,
          searchRequestId: state.searchRequestId + 1,
        })),
      setSearchTargetMessageId: (searchTargetMessageId) => set({ searchTargetMessageId }),

      startEditingMessage: (message) => {
        set({ editingMessage: message, replyingTo: null, composerText: message.text || "" });
      },
      cancelEditing: () => set({ editingMessage: null, composerText: "" }),
      editMessage: async (messageId, text) => {
        try {
          const res = await axiosInstance.patch(`/messages/${messageId}`, { text });
          set((state) => ({
            messages: updateMessageFromServer(state.messages, res.data),
            editingMessage: null,
            composerText: "",
          }));
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to edit message");
          return false;
        }
      },
      deleteMessage: async (messageId) => {
        try {
          const res = await axiosInstance.delete(`/messages/${messageId}`);
          set((state) => ({
            messages: markMessageDeleted(
              state.messages,
              messageId,
              res.data.deletedAt,
              res.data.deletedBy,
            ),
            editingMessage:
              state.editingMessage && String(state.editingMessage.id || state.editingMessage._id) === String(messageId)
                ? null
                : state.editingMessage,
            replyingTo:
              state.replyingTo && String(state.replyingTo.id || state.replyingTo._id) === String(messageId)
                ? null
                : state.replyingTo,
            composerText:
              state.editingMessage && String(state.editingMessage.id || state.editingMessage._id) === String(messageId)
                ? ""
                : state.composerText,
          }));
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete message");
          return false;
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, selectedGroup, messages, replyingTo } = get();
        if (!selectedUser && !selectedGroup) return false;

        try {
          const replyToId = replyingTo?._id || replyingTo?.id;
          if (replyToId) {
            if (messageData instanceof FormData) messageData.append("replyTo", replyToId);
            else messageData.replyTo = replyToId;
          }
          const target = selectedGroup ? `/groups/${selectedGroup._id}/messages` : `/messages/send/${selectedUser._id}`;
          const res = await axiosInstance.post(target, messageData);
          set({ messages: [...messages, res.data], composerText: "", replyingTo: null });
          selectedGroup ? get().getGroups() : get().getConversations();
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          return false;
        }
      },

      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        set({ typingUsers: {} });

        socket.off("newMessage");
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("messageDelivered");
        socket.off("messagesRead");
        socket.off("messageReactionUpdated");
        socket.off("pollUpdated");
        socket.off("messagePinUpdated");
        socket.off("messageUpdated");
        socket.off("messageDeleted");
        socket.off("newGroupMessage");
        socket.off("groupUpdated");
        socket.off("groupRemoved");
        socket.off("groupTyping");
        socket.off("groupStopTyping");
        socket.off("userMentioned");

        socket.on("userMentioned", ({ messageId, groupId, senderId, text }) => {
          const currentUserId = useAuthStore.getState().authUser?._id;
          if (String(senderId) === String(currentUserId)) return;
          const activeConversationId = get().activeConversationId;
          const targetKey = groupId ? `group:${groupId}` : senderId;
          if (activeConversationId !== targetKey) {
            toast("You were mentioned in a chat!", {
              icon: "💬",
            });
          }
          if (document.hidden && useAuthStore.getState().notificationSettings?.messages) {
            useAuthStore.getState().notifyBrowser({
              title: "Mentioned in ZestIz",
              body: text ? (text.length > 60 ? text.slice(0, 57) + "..." : text) : "You were mentioned in a chat",
              onClick: () => get().setActiveConversationId(targetKey),
            });
          }
        });

        socket.on("newMessage", (newMessage) => {
          const activeConversationId = get().activeConversationId;
          if (String(newMessage.senderId) === String(activeConversationId)) {
            set({ messages: [...get().messages, newMessage] });
          } else {
            set((state) => ({
              conversations: incrementConversationUnread(
                state.conversations,
                newMessage.senderId,
              ),
            }));
            if (document.hidden && useAuthStore.getState().notificationSettings.messages) {
              const sender = [...get().users, ...get().conversations].find(
                (user) => String(user._id) === String(newMessage.senderId),
              );
              const messageType = newMessage.audio
                ? "a voice message"
                : newMessage.image
                  ? "an image"
                  : newMessage.video
                    ? "a video"
                    : newMessage.poll
                      ? "a poll"
                    : "a message";
              useAuthStore.getState().notifyBrowser({
                title: "ZestIz",
                body: newMessage.poll ? `${sender?.fullName || "Someone"} created a poll` : `${sender?.fullName || "Someone"} sent you ${messageType}`,
                onClick: () => get().setActiveConversationId(newMessage.senderId),
              });
            }
          }

          get().getConversations();
        });

        socket.on("newGroupMessage", (newMessage) => {
          const groupKey = `group:${newMessage.groupId}`;
          if (get().activeConversationId === groupKey) {
            set({ messages: [...get().messages, newMessage] });
            return;
          }
          set((state) => ({
            groups: state.groups.map((group) => String(group._id) === String(newMessage.groupId)
              ? { ...group, unreadCount: (group.unreadCount || 0) + 1, lastMessage: newMessage }
              : group),
          }));
          const group = get().groups.find((item) => String(item._id) === String(newMessage.groupId));
          const sender = [...get().users, ...get().conversations].find((user) => String(user._id) === String(newMessage.senderId));
          if (document.hidden && useAuthStore.getState().notificationSettings.messages) {
            useAuthStore.getState().notifyBrowser({
              title: group?.name || "ZestIz group",
              body: newMessage.poll ? `${sender?.fullName || "Someone"} created a poll in ${group?.name || "a group"}` : `${sender?.fullName || "Someone"} sent a message`,
              onClick: () => get().setActiveConversationId(groupKey),
            });
          }
        });

        socket.on("groupUpdated", (group) => {
          set((state) => ({
            groups: state.groups.some((item) => String(item._id) === String(group._id))
              ? state.groups.map((item) => String(item._id) === String(group._id) ? { ...item, ...group } : item)
              : [...state.groups, group],
            selectedGroup: state.selectedGroup && String(state.selectedGroup._id) === String(group._id) ? group : state.selectedGroup,
          }));
        });

        socket.on("groupRemoved", ({ groupId }) => {
          set((state) => ({
            groups: state.groups.filter((group) => String(group._id) !== String(groupId)),
            ...(state.activeConversationId === `group:${groupId}` ? { activeConversationId: null, selectedGroup: null, messages: [] } : {}),
          }));
        });

        socket.on("groupTyping", ({ groupId, senderId }) => {
          if (get().activeConversationId === `group:${groupId}`) set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
        });
        socket.on("groupStopTyping", ({ groupId, senderId }) => {
          if (get().activeConversationId === `group:${groupId}`) set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: false } }));
        });

        socket.on("messageDelivered", ({ messageId, messageIds, deliveredAt }) => {
          const ids = messageIds || (messageId ? [messageId] : []);
          if (!ids.length) return;
          set((state) => ({
            messages: updateMessageReceipts(state.messages, ids, { deliveredAt }),
          }));
        });

        socket.on("messagesRead", ({ messageIds, readAt }) => {
          if (!messageIds?.length) return;
          set((state) => ({
            messages: updateMessageReceipts(state.messages, messageIds, { readAt }),
          }));
        });

        socket.on("messageReactionUpdated", ({ messageId, reactions }) => {
          if (!messageId || !reactions) return;
          set((state) => ({
            messages: updateMessageReactions(state.messages, messageId, reactions),
          }));
        });

        socket.on("pollUpdated", ({ messageId, poll }) => {
          if (!messageId || !poll) return;
          set((state) => ({ messages: updateMessagePoll(state.messages, messageId, poll) }));
        });

        socket.on("messagePinUpdated", (pin) => {
          if (!pin?.messageId) return;
          set((state) => ({
            messages: updateMessagePin(state.messages, pin.messageId, pin),
            pinnedMessages: pin.isPinned
              ? state.pinnedMessages.some((message) => String(message._id) === String(pin.messageId))
                ? state.pinnedMessages.map((message) => String(message._id) === String(pin.messageId) ? { ...message, ...pin } : message)
                : [{ ...state.messages.find((message) => String(message._id) === String(pin.messageId)), ...pin }, ...state.pinnedMessages]
              : state.pinnedMessages.filter((message) => String(message._id) !== String(pin.messageId)),
          }));
        });

        socket.on("messageUpdated", (updatedMessage) => {
          if (!updatedMessage?._id) return;
          set((state) => ({
            messages: updateMessageFromServer(state.messages, updatedMessage),
          }));
        });

        socket.on("messageDeleted", ({ messageId, deletedAt, deletedBy }) => {
          if (!messageId) return;
          set((state) => {
            const isEditingDeletedMessage =
              state.editingMessage &&
              String(state.editingMessage.id || state.editingMessage._id) === String(messageId);
            const isReplyingToDeletedMessage =
              state.replyingTo &&
              String(state.replyingTo.id || state.replyingTo._id) === String(messageId);
            return {
              messages: markMessageDeleted(state.messages, messageId, deletedAt, deletedBy),
              pinnedMessages: state.pinnedMessages.filter((message) => String(message._id) !== String(messageId)),
              editingMessage: isEditingDeletedMessage ? null : state.editingMessage,
              replyingTo: isReplyingToDeletedMessage ? null : state.replyingTo,
              composerText: isEditingDeletedMessage ? "" : state.composerText,
            };
          });
        });

        socket.on("typing", ({ senderId }) => {
          if (String(senderId) !== String(get().activeConversationId)) return;
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [senderId]: true,
            },
          }));
        });

        socket.on("stopTyping", ({ senderId }) => {
          if (String(senderId) !== String(get().activeConversationId)) return;
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [senderId]: false,
            },
          }));
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("typing");
        socket?.off("stopTyping");
        socket?.off("messageDelivered");
        socket?.off("messagesRead");
        socket?.off("messageReactionUpdated");
        socket?.off("pollUpdated");
        socket?.off("messagePinUpdated");
        socket?.off("messageUpdated");
        socket?.off("messageDeleted");
        socket?.off("newGroupMessage");
        socket?.off("groupUpdated");
        socket?.off("groupRemoved");
        socket?.off("groupTyping");
        socket?.off("groupStopTyping");
        socket?.off("userMentioned");
      },

      setSelectedUser: (selectedUser) => set({ selectedUser, selectedGroup: null, typingUsers: {}, replyingTo: null }),

      setReplyingTo: (replyingTo) => set({ replyingTo }),
      clearReplyingTo: () => set({ replyingTo: null }),

      setActiveConversationId: (activeConversationId) => {
        const groupId = String(activeConversationId || "").startsWith("group:") ? String(activeConversationId).slice(6) : null;
        set((state) => ({
          activeConversationId,
          selectedGroup: groupId ? state.groups.find((group) => String(group._id) === groupId) || null : null,
          selectedUser: groupId ? null : state.users.find((user) => user._id === activeConversationId) || state.conversations.find((user) => user._id === activeConversationId) || null,
          messages: activeConversationId ? state.messages : [],
          typingUsers: {},
          replyingTo: null,
          editingMessage: null,
          messageSearchQuery: "",
          searchResults: [],
          isSearchingMessages: false,
          searchTargetMessageId: null,
          searchRequestId: state.searchRequestId + 1,
          conversations: state.conversations.map((conversation) =>
            String(conversation._id) === String(activeConversationId)
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setComposerText: (composerText) => set({ composerText }),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),

      sendTextMessage: async (conversationId) => {
        const messageText = get().composerText.trim();
        if (!conversationId || !messageText) return false;

        return get().sendMessage({ text: messageText });
      },

      sendMediaMessage: async ({ conversationId, file }) => {
        if (!conversationId || !file) return false;

        const formData = new FormData();
        formData.append("media", file);

        set({ isSendingMedia: true });
        try {
          return await get().sendMessage(formData);
        } finally {
          set({ isSendingMedia: false });
        }
      },

      sendAudioMessage: async ({ conversationId, blob, duration }) => {
        if (!conversationId || !blob || !duration) return false;

        const formData = new FormData();
        const extension = blob.type.includes("ogg") ? "ogg" : "webm";
        formData.append("media", blob, `voice-message.${extension}`);
        formData.append("audioDuration", String(duration));

        set({ isSendingMedia: true });
        try {
          return await get().sendMessage(formData);
        } finally {
          set({ isSendingMedia: false });
        }
      },
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
);