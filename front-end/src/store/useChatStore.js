import { create } from "zustand";
import { persist } from "zustand/middleware";

import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      streaks: {},
      messages: [],
      selectedUser: null,
      isConversationsLoading: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      activeConversationId: null,
      searchQuery: "",
      sidebarTab: "chats",
      workspaceSection: "chat",
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set((state) => ({
            users: res.data,
            selectedUser:
              state.selectedUser &&
              res.data.some((user) => user._id === state.selectedUser._id)
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

      getStreaks: async () => {
        try {
          const res = await axiosInstance.get("/messages/streaks");
          set({
            streaks: Object.fromEntries(
              res.data.map((streak) => [String(streak.peerId), streak]),
            ),
          });
        } catch (error) {
          console.log("Error in getStreaks", error.message);
        }
      },

      markMessagesRead: async (peerId) => {
        if (!peerId) return;
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            String(conversation._id) === String(peerId)
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        }));
        try {
          await axiosInstance.patch(`/messages/read/${peerId}`);
          await get().getConversations();
        } catch (error) {
          console.log("Error marking messages as read", error.message);
        }
      },

      subscribeToStreakUpdates: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("streakUpdate");
        socket.on("streakUpdate", (streak) => {
          set((state) => ({
            streaks: { ...state.streaks, [String(streak.peerId)]: streak },
          }));
        });
      },

      unsubscribeFromStreakUpdates: () => {
        useAuthStore.getState().socket?.off("streakUpdate");
      },

      getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          // Ignore a slow response after the user has switched conversations.
          if (String(get().activeConversationId) !== String(userId)) return;
          // Preserve messages delivered by the socket while history was loading.
          set((state) => {
            const byId = new Map(res.data.map((message) => [String(message._id), message]));
            state.messages.forEach((message) => byId.set(String(message._id), message));
            return {
              messages: [...byId.values()].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              ),
            };
          });
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to load messages",
          );
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser } = get();
        if (!selectedUser) return false;

        try {
          const res = await axiosInstance.post(
            `/messages/send/${selectedUser._id}`,
            messageData,
          );
          set((state) => ({
            messages: state.messages.some(
              (message) => String(message._id) === String(res.data._id),
            )
              ? state.messages
              : [...state.messages, res.data].sort(
                  (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                ),
            composerText: "",
          }));
          get().getConversations();
          return true;
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to send message",
          );
          return false;
        }
      },

      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.on("newMessage", async (newMessage) => {
          const authUser = useAuthStore.getState().authUser;
          if (String(newMessage.receiverId) !== String(authUser?._id)) return;

          const peerId = String(newMessage.senderId);
          const isOpen = String(get().activeConversationId) === peerId;
          set((state) => ({
            messages:
              isOpen &&
              !state.messages.some(
                (message) => String(message._id) === String(newMessage._id),
              )
                ? [...state.messages, newMessage].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                  )
                : state.messages,
            conversations: state.conversations.map((conversation) =>
              String(conversation._id) === peerId
                ? {
                    ...conversation,
                    lastMessageText:
                      newMessage.text || (newMessage.image ? "Photo" : "Video"),
                    lastMessageSenderId: newMessage.senderId,
                    lastMessageAt: newMessage.createdAt,
                    unreadCount: isOpen
                      ? 0
                      : (conversation.unreadCount || 0) + 1,
                  }
                : conversation,
            ),
          }));

          if (isOpen) await get().markMessagesRead(peerId);
          else get().getConversations();
        });

        socket.off("messagesRead");
        socket.on("messagesRead", ({ peerId }) => {
          set((state) => ({
            conversations: state.conversations.map((conversation) =>
              String(conversation._id) === String(peerId)
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
          }));
        });

        socket.off("streakNotice");
        socket.on("streakNotice", (notice) => {
          const activeConversationId = get().activeConversationId;
          const isInConversation =
            String(notice.senderId) === String(activeConversationId) ||
            String(notice.receiverId) === String(activeConversationId);
          if (!isInConversation) return;
          set((state) => ({
            messages: state.messages.some(
              (message) => String(message._id) === String(notice._id),
            )
              ? state.messages
              : [...state.messages, notice],
          }));
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("messagesRead");
        socket?.off("streakNotice");
      },

      setSelectedUser: (selectedUser) => set({ selectedUser }),

      setActiveConversationId: (activeConversationId) => {
        set((state) => ({
          activeConversationId,
          selectedUser:
            state.users.find((user) => user._id === activeConversationId) ||
            state.conversations.find(
              (user) => user._id === activeConversationId,
            ) ||
            null,
          messages:
            activeConversationId &&
            String(state.activeConversationId) === String(activeConversationId)
              ? state.messages
              : [],
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setWorkspaceSection: (workspaceSection) => set({ workspaceSection }),
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
    }),
    {
      name: "imessage-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    },
  ),
);
