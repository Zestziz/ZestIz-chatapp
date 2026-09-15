import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useFriendStore } from "./useFriendStore";
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

let globalTypingTimeout = null;

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
      messagesByChatId: {},
      lastFetchedChats: {},
      lastFetchedUsers: 0,
      lastFetchedConversations: 0,
      lastFetchedGroups: 0,

      getUsers: async (force = false) => {
        const { users, lastFetchedUsers } = get();
        const isStale = Date.now() - lastFetchedUsers > 2.5 * 60 * 1000;
        if (!force && users.length > 0 && !isStale) return;

        if (users.length === 0) set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            lastFetchedUsers: Date.now(),
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

      getConversations: async (force = false) => {
        const { conversations, lastFetchedConversations } = get();
        const isStale = Date.now() - lastFetchedConversations > 2.5 * 60 * 1000;
        if (!force && conversations.length > 0 && !isStale) return;

        if (conversations.length === 0) set({ isConversationsLoading: true });
        try {
          const res = await axiosInstance.get("/messages/conversations");
          set({ conversations: res.data, lastFetchedConversations: Date.now() });
        } catch (error) {
          console.log("Error in getConversations", error.message);
        } finally {
          set({ isConversationsLoading: false });
        }
      },

      getGroups: async (force = false) => {
        const { groups, lastFetchedGroups } = get();
        const isStale = Date.now() - lastFetchedGroups > 2.5 * 60 * 1000;
        if (!force && groups.length > 0 && !isStale) return;

        try {
          const res = await axiosInstance.get("/groups");
          set({ groups: res.data, lastFetchedGroups: Date.now() });
        } catch (error) {
          console.log("Error in getGroups", error.message);
        }
      },

      getGroupMessages: async (groupId, force = false) => {
        if (!groupId) return;
        const chatId = `group:${groupId}`;
        const { messagesByChatId, lastFetchedChats } = get();
        const cached = messagesByChatId[chatId] || [];
        const isStale = Date.now() - (lastFetchedChats[chatId] || 0) > 2.5 * 60 * 1000;

        if (cached.length > 0) {
          set({ messages: cached });
          if (!isStale && !force) return;
        } else {
          set({ messages: [], isMessagesLoading: true });
        }

        try {
          const res = await axiosInstance.get(`/groups/${groupId}/messages`);
          set((state) => ({
            messages: res.data,
            messagesByChatId: { ...state.messagesByChatId, [chatId]: res.data },
            lastFetchedChats: { ...state.lastFetchedChats, [chatId]: Date.now() },
          }));
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

      transferOwnership: async (groupId, userId) => {
        try {
          const res = await axiosInstance.post(`/groups/${groupId}/members`, { action: "transfer", userId });
          set((state) => ({
            groups: state.groups.map((group) => String(group._id) === String(groupId) ? { ...group, ...res.data } : group),
            selectedGroup: res.data,
          }));
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to transfer ownership");
          return false;
        }
      },

      getMessages: async (userId, force = false) => {
        if (!userId) return;
        const chatId = String(userId);
        const { messagesByChatId, lastFetchedChats } = get();
        const cached = messagesByChatId[chatId] || [];
        const isStale = Date.now() - (lastFetchedChats[chatId] || 0) > 2.5 * 60 * 1000;

        if (cached.length > 0) {
          set({ messages: cached });
          if (!isStale && !force) return;
        } else {
          set({ messages: [], isMessagesLoading: true });
        }

        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set((state) => ({
            messages: res.data,
            messagesByChatId: { ...state.messagesByChatId, [chatId]: res.data },
            lastFetchedChats: { ...state.lastFetchedChats, [chatId]: Date.now() },
          }));
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

      deleteConversation: async (targetUserId) => {
        if (!targetUserId) return false;
        const rawId = String(targetUserId).replace(/^group:/, "");
        const isGroup = String(targetUserId).startsWith("group:");

        const {
          conversations,
          groups,
          messages,
          selectedUser,
          selectedGroup,
          activeConversationId,
          messagesByChatId,
          lastFetchedChats,
        } = get();

        // 1. Optimistic updates
        const nextConversations = conversations.filter((c) => {
          const cId = String(c._id || c.id || c.group?._id || "").replace(/^group:/, "");
          return cId !== rawId;
        });

        const nextGroups = groups.map((g) =>
          String(g._id).replace(/^group:/, "") === rawId
            ? { ...g, lastMessage: null, unreadCount: 0 }
            : g
        );

        const isCurrentChatActive =
          String(activeConversationId || "").replace(/^group:/, "") === rawId;

        const updatedMessagesByChatId = { ...messagesByChatId };
        delete updatedMessagesByChatId[`group:${rawId}`];
        delete updatedMessagesByChatId[rawId];

        const updatedLastFetchedChats = { ...lastFetchedChats };
        delete updatedLastFetchedChats[`group:${rawId}`];
        delete updatedLastFetchedChats[rawId];

        set({
          conversations: nextConversations,
          groups: nextGroups,
          messagesByChatId: updatedMessagesByChatId,
          lastFetchedChats: updatedLastFetchedChats,
          ...(isCurrentChatActive
            ? {
                selectedUser: null,
                selectedGroup: null,
                activeConversationId: null,
                messages: [],
                pinnedMessages: [],
                replyingTo: null,
                editingMessage: null,
              }
            : {}),
        });

        try {
          await axiosInstance.delete(isGroup ? `/groups/${rawId}/messages/clear` : `/messages/conversations/${rawId}`);
          toast.success("Conversation deleted successfully");
          return true;
        } catch (error) {
          // Rollback on error
          set({
            conversations,
            groups,
            messagesByChatId,
            lastFetchedChats,
            ...(isCurrentChatActive
              ? {
                  selectedUser,
                  selectedGroup,
                  activeConversationId,
                  messages,
                }
              : {}),
          });
          toast.error(error.response?.data?.message || "Failed to delete conversation");
          return false;
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, selectedGroup, messages, replyingTo } = get();
        if (!selectedUser && !selectedGroup) return false;

        const tempId = `temp-${Date.now()}`;
        const authUser = useAuthStore.getState().authUser;

        // Optimistic UI: Prepare optimistic message
        let imageUrl = null;
        let text;
        if (messageData instanceof FormData) {
          text = messageData.get("text") || "";
          const file = messageData.get("media");
          if (file && file.type?.startsWith("image/")) {
            imageUrl = URL.createObjectURL(file);
          }
        } else {
          text = messageData.text || "";
        }

        const optimisticMessage = {
          _id: tempId,
          id: tempId,
          senderId: authUser?._id,
          senderName: "You",
          senderPic: authUser?.profilePic,
          text: text,
          image: imageUrl,
          createdAt: new Date().toISOString(),
          status: "sending",
          reactions: [],
          replyTo: replyingTo ? {
            id: replyingTo._id || replyingTo.id,
            senderName: replyingTo.senderName, // simplified; assuming replyTo is already structured or just passed through
            text: replyingTo.text,
          } : null,
        };

        // Apply optimistic update
        let nextConversations = get().conversations;

        if (selectedUser) {
          const targetUserId = selectedUser._id || selectedUser.id;
          const conversationIndex = nextConversations.findIndex(
            (c) => String(c._id) === String(targetUserId)
          );

          if (conversationIndex === -1) {
            // Missing conversation: Add it dynamically instantly
            const newConversation = {
              _id: targetUserId,
              id: targetUserId,
              fullName: selectedUser.fullName || selectedUser.name || "User",
              username: selectedUser.username,
              profilePic: selectedUser.profilePic || selectedUser.avatarUrl || selectedUser.avatar || "",
              email: selectedUser.email,
              lastSeen: selectedUser.lastSeen,
              unreadCount: 0,
              lastMessage: optimisticMessage,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            nextConversations = [newConversation, ...nextConversations];
          } else {
            // Already present: Update its lastMessage and bump it to top
            const existingConv = nextConversations[conversationIndex];
            const updatedConv = {
              ...existingConv,
              lastMessage: optimisticMessage,
              updatedAt: new Date().toISOString(),
            };
            nextConversations = [
              updatedConv,
              ...nextConversations.slice(0, conversationIndex),
              ...nextConversations.slice(conversationIndex + 1),
            ];
          }
        }

        set({
          messages: [...messages, optimisticMessage],
          conversations: nextConversations,
          composerText: "",
          replyingTo: null
        });

        try {
          const replyToId = replyingTo?._id || replyingTo?.id;
          if (replyToId) {
            if (messageData instanceof FormData) messageData.append("replyTo", replyToId);
            else messageData.replyTo = replyToId;
          }
          const targetUserOrGroupId = selectedGroup ? (selectedGroup._id || selectedGroup.id) : (selectedUser._id || selectedUser.id);
          const target = selectedGroup ? `/groups/${targetUserOrGroupId}/messages` : `/messages/send/${targetUserOrGroupId}`;
          const res = await axiosInstance.post(target, messageData);

          // Reconcile with server data
          set((state) => {
            const activeChatId = selectedGroup ? `group:${selectedGroup._id}` : String(selectedUser._id);
            return {
              messages: state.messages.map(msg => msg._id === tempId ? res.data : msg),
              messagesByChatId: {
                ...state.messagesByChatId,
                [activeChatId]: (state.messagesByChatId[activeChatId] || []).map(msg =>
                  msg._id === tempId ? res.data : msg
                )
              },
              ...(selectedGroup ? {
                groups: state.groups.map(group =>
                  String(group._id) === String(selectedGroup._id)
                    ? { ...group, lastMessage: res.data }
                    : group
                )
              } : {})
            };
          });

          selectedGroup ? get().getGroups() : get().getConversations();
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          // Mark as error
          set((state) => ({
            messages: state.messages.map(msg => msg._id === tempId ? { ...msg, status: "error" } : msg)
          }));
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

        socket.on("userMentioned", ({ groupId, senderId, text }) => {
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
          const isCurrentActive = String(newMessage.senderId) === String(activeConversationId);
          const currentConversations = get().conversations;
          const senderIdStr = String(newMessage.senderId);

          const conversationIndex = currentConversations.findIndex(
            (c) => String(c._id || c.id || c.userId || c.user?._id) === senderIdStr
          );

          let nextConversations = [...currentConversations];

          if (conversationIndex === -1) {
            // Find sender in users or friends
            const knownUser =
              get().users.find((u) => String(u._id || u.id) === senderIdStr) ||
              useFriendStore.getState().friends.find((f) => String(f._id || f.id) === senderIdStr);

            const newConversation = {
              _id: newMessage.senderId,
              id: newMessage.senderId,
              fullName: knownUser?.fullName || knownUser?.name || newMessage.senderName || "User",
              username: knownUser?.username || newMessage.senderUsername || "",
              profilePic: knownUser?.profilePic || knownUser?.avatarUrl || knownUser?.avatar || newMessage.senderPic || "",
              email: knownUser?.email || "",
              lastSeen: knownUser?.lastSeen || new Date().toISOString(),
              unreadCount: isCurrentActive ? 0 : 1,
              lastMessage: newMessage,
              createdAt: newMessage.createdAt || new Date().toISOString(),
              updatedAt: newMessage.createdAt || new Date().toISOString(),
            };

            nextConversations = [newConversation, ...nextConversations];
          } else {
            const existingConv = currentConversations[conversationIndex];
            const updatedConv = {
              ...existingConv,
              unreadCount: isCurrentActive ? 0 : (existingConv.unreadCount || 0) + 1,
              lastMessage: newMessage,
              updatedAt: newMessage.createdAt || new Date().toISOString(),
            };

            nextConversations = [
              updatedConv,
              ...currentConversations.slice(0, conversationIndex),
              ...currentConversations.slice(conversationIndex + 1),
            ];
          }

          if (isCurrentActive) {
            set({
              messages: [...get().messages, newMessage],
              conversations: nextConversations,
            });
          } else {
            set({
              conversations: nextConversations,
            });

            if (document.hidden && useAuthStore.getState().notificationSettings.messages) {
              const sender = [...get().users, ...nextConversations].find(
                (user) => String(user._id) === senderIdStr,
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

          // Trigger a silent background fetch to ensure everything is perfectly in sync
          get().getConversations(true);
        });

        socket.on("newGroupMessage", (newMessage) => {
          const groupKey = `group:${newMessage.groupId}`;
          const isActive = get().activeConversationId === groupKey;
          set((state) => ({
            messages: isActive ? [...state.messages, newMessage] : state.messages,
            messagesByChatId: {
              ...state.messagesByChatId,
              [groupKey]: [...(state.messagesByChatId[groupKey] || []), newMessage]
            },
            groups: state.groups.map(group =>
              String(group._id) === String(newMessage.groupId)
                ? { ...group, unreadCount: isActive ? 0 : (group.unreadCount || 0) + 1, lastMessage: newMessage }
                : group
            ),
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
          selectedUser: groupId ? null :
            state.users.find((user) => user._id === activeConversationId) ||
            state.conversations.find((user) => user._id === activeConversationId) ||
            useFriendStore.getState().friends.find((user) => user._id === activeConversationId) ||
            null,
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

      dispatchTyping: (conversationId, isGroup) => {
        const { socket } = useAuthStore.getState();
        if (!socket || !conversationId) return;

        const payload = isGroup ? { groupId: conversationId } : { receiverId: conversationId };

        if (!globalTypingTimeout) {
          socket.emit("typing", payload);
        } else {
          clearTimeout(globalTypingTimeout);
        }

        globalTypingTimeout = setTimeout(() => {
          socket.emit("stopTyping", payload);
          globalTypingTimeout = null;
        }, 2500);
      },

      stopTyping: (conversationId, isGroup) => {
        if (!globalTypingTimeout) return;
        const { socket } = useAuthStore.getState();
        if (!socket || !conversationId) return;

        clearTimeout(globalTypingTimeout);
        globalTypingTimeout = null;
        const payload = isGroup ? { groupId: conversationId } : { receiverId: conversationId };
        socket.emit("stopTyping", payload);
      },

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