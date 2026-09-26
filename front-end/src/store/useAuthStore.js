import { create } from "zustand";
import { axiosInstance, SERVER_URL } from "../lib/axios";
import { io } from "socket.io-client";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  authError: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true, authError: null });

    try {
      const res = await axiosInstance.get("/auth/check", { timeout: 15000 });
      set({ authUser: res.data });

      get().connectSocket(res.data);
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({
        authUser: null,
        authError:
          error.response?.data?.message ||
          "The chat server did not respond. Check the deployment and try again.",
      });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  syncProfile: async () => {
    try {
      const res = await axiosInstance.patch("/auth/profile");
      set({ authUser: res.data });
    } catch (error) {
      console.error("Could not sync profile:", error.message);
    }
  },

  clearAuth: () => {
    set({
      authUser: null,
      authError: null,
      isCheckingAuth: false,
      onlineUsers: [],
    });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    if (!user || get().socket) return;

    const socket = io(SERVER_URL, {
      query: { userId: user._id },
      withCredentials: true,
      reconnection: true,
    });

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("presenceVisibilityChanged", ({ userId, enabled }) => {
      const update = (items) => items.map((user) => String(user._id) === String(userId) ? { ...user, showOnlineStatus: enabled } : user);
      import("./useChatStore").then(({ useChatStore }) => useChatStore.setState((state) => ({ users: update(state.users), conversations: update(state.conversations) })));
    });

    socket.on("userUpdated", (updatedUser) => {
      if (String(get().authUser?._id) === String(updatedUser._id)) set({ authUser: { ...get().authUser, ...updatedUser } });
      import("./useChatStore").then(({ useChatStore }) => useChatStore.setState((state) => {
        const update = (user) => String(user?._id) === String(updatedUser._id) ? { ...user, ...updatedUser } : user;
        return { users: state.users.map(update), conversations: state.conversations.map(update), selectedUser: update(state.selectedUser) };
      }));
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },
}));
