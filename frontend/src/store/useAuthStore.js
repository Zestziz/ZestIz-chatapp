import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import { useFriendStore } from "./useFriendStore";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  lastSeenByUser: {},
  notificationSettings: JSON.parse(localStorage.getItem("zestiz-notification-settings") || "null") || {
    enabled: false,
    messages: true,
    friendRequests: true,
  },
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      if (res.data.privacySettings) {
        useFriendStore.setState({ messagePermission: res.data.privacySettings.messagePermission });
      }

      get().connectSocket(res.data);
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [], lastSeenByUser: {} });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    if (!user || get().socket?.connected) return;

    const socket = io(BASE_URL, { query: { userId: user._id } });

    set({ socket });

    useFriendStore.getState().subscribeToFriendEvents();

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("userOffline", ({ userId, lastSeen }) => {
      set((state) => ({
        lastSeenByUser: {
          ...state.lastSeenByUser,
          [userId]: lastSeen,
        },
      }));
    });
  },

  disconnectSocket: () => {
    useFriendStore.getState().unsubscribeFromFriendEvents();
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },

  setNotificationSettings: (notificationSettings) => {
    localStorage.setItem("zestiz-notification-settings", JSON.stringify(notificationSettings));
    set({ notificationSettings });
  },

  enableNotifications: async () => {
    if (!("Notification" in window)) return "unsupported";
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission === "granted") {
      const settings = { ...get().notificationSettings, enabled: true };
      get().setNotificationSettings(settings);
    }
    return permission;
  },

  notifyBrowser: ({ title, body, onClick }) => {
    const { notificationSettings } = get();
    if (!notificationSettings.enabled || !("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const notification = new Notification(title, { body, icon: "/logo.png" });
      notification.onclick = () => {
        window.focus();
        notification.close();
        onClick?.();
      };
    } catch (error) {
      console.warn("Browser notification unavailable", error.message);
    }
  },
}));