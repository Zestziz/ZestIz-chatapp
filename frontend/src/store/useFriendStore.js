import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import toast from "react-hot-toast";

export const useFriendStore = create((set, get) => ({
  friends: [],
  blockedUsers: [],
  incomingRequests: [],
  outgoingRequests: [],
  mutualCounts: {},
  messagePermission: "everyone",
  isFriendsLoading: false,
  isBlockedLoading: false,
  isPendingLoading: false,

  getFriends: async () => {
    set({ isFriendsLoading: true });
    try {
      const res = await axiosInstance.get("/friends");
      set({ friends: res.data });
    } catch (error) {
      console.error("Error in getFriends:", error.message);
    } finally {
      set({ isFriendsLoading: false });
    }
  },

  fetchBlockedUsers: async () => {
    set({ isBlockedLoading: true });
    try {
      const res = await axiosInstance.get("/friends/blocked");
      set({ blockedUsers: res.data });
    } catch (error) {
      console.error("Error in fetchBlockedUsers:", error.message);
    } finally {
      set({ isBlockedLoading: false });
    }
  },

  getPendingRequests: async () => {
    set({ isPendingLoading: true });
    try {
      const res = await axiosInstance.get("/friends/pending");
      set({
        incomingRequests: res.data.incoming,
        outgoingRequests: res.data.outgoing,
      });
    } catch (error) {
      console.error("Error in getPendingRequests:", error.message);
    } finally {
      set({ isPendingLoading: false });
    }
  },

  sendFriendRequest: async (userId) => {
    try {
      const res = await axiosInstance.post(`/friends/request/${userId}`);
      toast.success(res.data.message);
      if (res.data.status === "accepted") {
        get().getFriends();
      }
      get().getPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send friend request");
    }
  },

  acceptRequest: async (senderId) => {
    try {
      await axiosInstance.post(`/friends/accept/${senderId}`);
      toast.success("Friend request accepted");
      get().getPendingRequests();
      get().getFriends();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    }
  },

  rejectRequest: async (senderId) => {
    try {
      await axiosInstance.post(`/friends/reject/${senderId}`);
      toast.success("Friend request rejected");
      get().getPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  },

  cancelRequest: async (targetId) => {
    try {
      await axiosInstance.post(`/friends/cancel/${targetId}`);
      toast.success("Friend request cancelled");
      get().getPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel request");
    }
  },

  removeFriend: async (friendId) => {
    try {
      await axiosInstance.post(`/friends/remove/${friendId}`);
      toast.success("Friend removed");
      get().getFriends();
      useChatStore.getState().getUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    }
  },

  blockUser: async (userId) => {
    try {
      await axiosInstance.post(`/friends/block/${userId}`);
      toast.success("User blocked");

      // Update state by adding user to blockedUsers and removing from friends
      set((state) => ({
        friends: state.friends.filter((f) => (f._id || f.id) !== userId),
        blockedUsers: state.blockedUsers.some((b) => (b._id || b.id) === userId)
          ? state.blockedUsers
          : [...state.blockedUsers, { _id: userId }],
      }));

      // Refresh data from server
      get().getFriends();
      get().getPendingRequests();
      get().fetchBlockedUsers();

      // Close active chat if opened with this user
      const chatStore = useChatStore.getState();
      if (
        chatStore.selectedUser?._id === userId ||
        chatStore.selectedUser?.id === userId ||
        chatStore.activeConversationId === userId
      ) {
        chatStore.setActiveConversationId(null);
        chatStore.setSelectedUser(null);
      }

      chatStore.getUsers();
      chatStore.getConversations();
    } catch (error) {
      console.error("Error in blockUser:", error.message || error);
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  },

  unblockUser: async (userId) => {
    try {
      await axiosInstance.post(`/friends/unblock/${userId}`);
      toast.success("User unblocked");
      get().fetchBlockedUsers();
      useChatStore.getState().getUsers();
      useChatStore.getState().getConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  },

  getMutualCount: async (userId) => {
    try {
      const res = await axiosInstance.get(`/friends/mutual/${userId}`);
      set((state) => ({
        mutualCounts: { ...state.mutualCounts, [userId]: res.data.count },
      }));
    } catch (error) {
      console.error("Error in getMutualCount:", error.message);
    }
  },

  updatePrivacy: async (messagePermission) => {
    try {
      await axiosInstance.put("/friends/privacy", { messagePermission });
      set({ messagePermission });
      toast.success(`Messages set to: ${messagePermission === "everyone" ? "Everyone" : "Friends only"}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update privacy");
    }
  },

  togglePrivacy: async () => {
    const current = get().messagePermission;
    const next = current === "everyone" ? "friends_only" : "everyone";
    await get().updatePrivacy(next);
  },

  subscribeToFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newFriendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestCancelled");
    socket.off("friendRemoved");
    socket.off("userBlocked");

    socket.on("newFriendRequest", ({ sender }) => {
      get().getPendingRequests();
      if (document.hidden && useAuthStore.getState().notificationSettings.friendRequests) {
        useAuthStore.getState().notifyBrowser({
          title: "ZestIz",
          body: `${sender?.fullName || "Someone"} sent you a friend request`,
        });
      }
    });

    socket.on("friendRequestAccepted", () => {
      get().getFriends();
      get().getPendingRequests();
    });

    socket.on("friendRequestCancelled", () => {
      get().getPendingRequests();
    });

    socket.on("friendRemoved", () => {
      get().getFriends();
      useChatStore.getState().getUsers();
    });

    socket.on("userBlocked", ({ blockerId }) => {
      get().getFriends();
      get().getPendingRequests();

      const chatStore = useChatStore.getState();
      if (
        chatStore.selectedUser?._id === blockerId ||
        chatStore.activeConversationId === blockerId
      ) {
        chatStore.setActiveConversationId(null);
        chatStore.setSelectedUser(null);
      }

      chatStore.getUsers();
      chatStore.getConversations();
    });
  },

  unsubscribeFromFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newFriendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestCancelled");
    socket.off("friendRemoved");
    socket.off("userBlocked");
  },
}));
