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
  },

  disconnectSocket: () => {
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },
}));
