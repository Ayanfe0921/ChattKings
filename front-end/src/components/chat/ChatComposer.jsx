import { Button, TextArea } from "@heroui/react";
import { ImageIcon, LoaderIcon, SendHorizontalIcon, SmileIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import useKeyboardSound from "../../hooks/useKeyboardSound";
import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { EmojiStickerPicker } from "./EmojiStickerPicker";

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const isSendingMedia = useChatStore((state) => state.isSendingMedia);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const replyingTo = useChatStore((state) => state.replyingTo);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const sendStickerMessage = useChatStore((state) => state.sendStickerMessage);
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const mediaInputRef = useRef(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) playRandomKeyStrokeSound();
  };

  const handleSend = async () => {
    const didSendMessage = await sendTextMessage(activeConversationId);
    if (didSendMessage) playSoundIfEnabled();
  };

  const handleComposerTextChange = (event) => {
    setComposerText(event.target.value);
    playSoundIfEnabled();
  };

  const insertEmoji = (emoji) => {
    setComposerText(`${composerText}${emoji}`);
  };

  const sendSticker = async (sticker) => {
    setIsPickerOpen(false);
    const didSend = await sendStickerMessage({ conversationId: activeConversationId, sticker });
    if (didSend) playSoundIfEnabled();
  };

  const replySummary = replyingTo?.text || (replyingTo?.imageUrl ? "Photo" : replyingTo?.videoUrl ? "Video" : replyingTo?.sticker ? "Sticker" : "Message");

  const handleMediaPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
    });

    if (didSendMessage) playSoundIfEnabled();
  };

  return (
    <footer className="shrink-0 border-t border-border px-1.5 pb-2 pt-2 sm:px-2">
      {replyingTo ? <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border-l-2 border-accent bg-surface px-3 py-2">
        <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-accent">Replying to {replyingTo.role === "me" ? "yourself" : activeConversation?.peer.name || "message"}</p><p className="truncate text-xs text-muted">{replySummary}</p></div>
        <button type="button" onClick={() => setReplyingTo(null)} className="grid size-7 place-items-center rounded-full hover:bg-background" aria-label="Cancel reply"><XIcon className="size-4" /></button>
      </div> : null}
      {isSendingMedia ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          <LoaderIcon
            className="size-4 shrink-0 animate-spin text-accent"
            strokeWidth={2}
            aria-hidden
          />
          <span className="truncate">Uploading media...</span>
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-full items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1">
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          disabled={isSendingMedia}
          tabIndex={-1}
          aria-hidden
          onChange={handleMediaPick}
        />
        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSendingMedia}
          className="size-9 shrink-0 touch-manipulation self-end text-accent"
          onPress={() => mediaInputRef.current?.click()}
        >
          <ImageIcon className="size-5 sm:size-6" strokeWidth={2} />
        </Button>
        <div className="relative shrink-0 self-end">
          <Button variant="ghost" isIconOnly aria-label="Open emoji and sticker picker" aria-expanded={isPickerOpen} className="size-9 touch-manipulation text-accent" onPress={() => setIsPickerOpen((open) => !open)}>
            <SmileIcon className="size-5" />
          </Button>
          {isPickerOpen ? <EmojiStickerPicker onEmoji={insertEmoji} onSticker={sendSticker} /> : null}
        </div>
        <TextArea
          fullWidth
          variant="secondary"
          placeholder="Start Chatting"
          rows={1}
          value={composerText}
          onChange={handleComposerTextChange}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 rounded-full"
        />

        <Button variant="primary" isIconOnly isDisabled={!composerText.trim()} onPress={handleSend}>
          <SendHorizontalIcon className="size-5" />
        </Button>
      </div>
    </footer>
  );
}
