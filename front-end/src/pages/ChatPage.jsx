import { useWallpaper } from "../context/wallpaper";
import { useChatStore } from "../store/useChatStore";
import { useSelectedConversation } from "../hooks/useSelectedConversation";
import { useEffect } from "react";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";
import { CallOverlay } from "../components/chat/CallOverlay";
import { WorkspaceRail } from "../components/chat/WorkspaceRail";
import { CountdownPanel } from "../components/chat/CountdownPanel";
import { CallHistoryPanel } from "../components/chat/CallHistoryPanel";
import { PostsPanel } from "../components/chat/PostsPanel";
import { GroupWorkspace } from "../components/chat/GroupWorkspace";
import { CodexChatPanel } from "../components/chat/CodexChatPanel";
import { QuotesPanel } from "../components/chat/QuotesPanel";

function ChatPage() {
  const { frameStyle } = useWallpaper();

  const getConversations = useChatStore((state) => state.getConversations);
  const workspaceSection = useChatStore((state) => state.workspaceSection);
  const getStreaks = useChatStore((state) => state.getStreaks);
  const subscribeToStreakUpdates = useChatStore((state) => state.subscribeToStreakUpdates);
  const unsubscribeFromStreakUpdates = useChatStore((state) => state.unsubscribeFromStreakUpdates);
  const getMessages = useChatStore((state) => state.getMessages);
  const markMessagesRead = useChatStore((state) => state.markMessagesRead);
  const getUsers = useChatStore((state) => state.getUsers);
  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);

  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  useEffect(() => {
    getUsers();
    getConversations();
    getStreaks();
  }, [getConversations, getStreaks, getUsers]);

  useEffect(() => {
    subscribeToStreakUpdates();
    return () => unsubscribeFromStreakUpdates();
  }, [subscribeToStreakUpdates, unsubscribeFromStreakUpdates]);

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (!activeConversationId) return;

    getMessages(activeConversationId);
    markMessagesRead(activeConversationId);
  }, [getMessages, markMessagesRead, activeConversationId]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-2 sm:p-3 md:p-8" style={frameStyle}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden rounded-2xl border border-border bg-background text-foreground">
        <WorkspaceRail />

        {workspaceSection === "chat" ? (
          <>
            <ChatSidebar />
            <div
              className={`flex-1 flex-col overflow-hidden ${
                !isLargeScreen && !activeConversationId ? "hidden lg:flex" : "flex"
              }`}
            >
              <ChatHeader />
              <MessageList />
              {activeConversation ? <ChatComposer /> : null}
            </div>
          </>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto">
            {workspaceSection === "countdowns" ? <CountdownPanel /> : null}
            {workspaceSection === "calls" ? <CallHistoryPanel /> : null}
            {workspaceSection === "posts" ? <PostsPanel /> : null}
            {workspaceSection === "groups" ? <GroupWorkspace /> : null}
            {workspaceSection === "codex" ? <CodexChatPanel /> : null}
            {workspaceSection === "quotes" ? <QuotesPanel /> : null}
          </main>
        )}
      </div>
      <CallOverlay />
    </div>
  );
}
export default ChatPage;
