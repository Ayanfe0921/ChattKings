import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const toggleMessageReaction = useChatStore((state) => state.toggleMessageReaction);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const setMessagePin = useChatStore((state) => state.setMessagePin);
  const messageSearchQuery = useChatStore((state) => state.messageSearchQuery);
  const currentUserId = useAuthStore((state) => state.authUser?._id);
  const pinnedMessages = (activeConversation?.messages || [])
    .flatMap((message) => (message.pinnedBy || []).some((pin) => String(pin.userId) === String(currentUserId)) ? [message] : [])
    .sort((a, b) => new Date(b.pinnedBy.find((pin) => String(pin.userId) === String(currentUserId)).pinnedAt) - new Date(a.pinnedBy.find((pin) => String(pin.userId) === String(currentUserId)).pinnedAt));

  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(activeConversationId, lastMessageId);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation ? (
        <>
        {pinnedMessages.length ? <div className="max-h-28 shrink-0 space-y-1 overflow-y-auto border-b border-border bg-accent/5 px-3 py-2">{pinnedMessages.map((message) => <button key={message.id} type="button" onClick={() => document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface"><span className="shrink-0 text-accent">📌</span><span className="min-w-0 flex-1 truncate text-xs">{message.text || (message.imageUrl ? "Photo" : message.videoUrl ? "Video" : message.audioUrl ? "Voice note" : message.sticker ? "Sticker" : "Pinned message")}</span></button>)}</div> : null}
        <div
          ref={messagesScrollRef}
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
        >
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
            Today
          </p>
          {activeConversation.messages.filter((message) => !messageSearchQuery.trim() || message.text.toLowerCase().includes(messageSearchQuery.trim().toLowerCase())).map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onReply={setReplyingTo}
              onReact={toggleMessageReaction}
              onDelete={deleteMessage}
              onPin={setMessagePin}
            />
          ))}
        </div>
        </>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
