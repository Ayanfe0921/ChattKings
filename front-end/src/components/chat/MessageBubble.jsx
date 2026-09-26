import { withTransform } from "../../lib/imagekit";
import { MessageVideo } from "./MessageVideo";
import { useEffect, useRef, useState } from "react";
import { CornerUpLeftIcon, SmilePlusIcon, Trash2Icon, PinIcon } from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

// Compress + size images for the bubble (q-auto works for images; f-auto picks WebP/AVIF).
const IMAGE_TRANSFORM = "q-auto,w-640,f-auto";

export function MessageBubble({ message, onReply, onReact, onDelete, onPin, currentUserId }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const reactionTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);
  const isPinned = (message.pinnedBy || []).some((pin) => String(pin.userId) === String(currentUserId));
  useEffect(() => () => clearTimeout(reactionTimeoutRef.current), []);
  if (message.kind === "streak-notice") {
    return (
      <div className="flex w-full justify-center py-1" role="status">
        <p className="rounded-full bg-accent/10 px-3 py-1.5 text-center text-xs font-medium text-accent">
          {message.text}
        </p>
      </div>
    );
  }

  const isOwnMessage = message.role === "me";
  const hasImage = Boolean(message.imageUrl);
  const hasVideo = Boolean(message.videoUrl);
  const reactions = (message.reactions || []).reduce((groups, reaction) => {
    const current = groups.find((item) => item.emoji === reaction.emoji);
    if (current) {
      current.count += 1;
      current.mine ||= String(reaction.userId) === String(currentUserId);
    } else {
      groups.push({ emoji: reaction.emoji, count: 1, mine: String(reaction.userId) === String(currentUserId) });
    }
    return groups;
  }, []);

  return (
    <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[min(90%,28rem)] rounded-2xl px-3 py-2 text-[15px] leading-snug sm:max-w-[min(75%,28rem)] sm:px-3.5 ${
          isOwnMessage
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md bg-surface"
        }`}
        id={`message-${message.id}`}
        onDoubleClick={() => onReply(message)}
        onTouchStart={(event) => {
          touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          clearTimeout(reactionTimeoutRef.current);
          reactionTimeoutRef.current = setTimeout(() => {
            if (touchStartRef.current) touchStartRef.current.held = true;
            setShowReactions(true);
            reactionTimeoutRef.current = setTimeout(() => setShowReactions(false), 10000);
          }, 500);
        }}
        onTouchMove={(event) => {
          if (touchStartRef.current) {
            const dx = Math.abs(event.touches[0].clientX - touchStartRef.current.x);
            const dy = Math.abs(event.touches[0].clientY - touchStartRef.current.y);
            if (dx > 12 || dy > 12) clearTimeout(reactionTimeoutRef.current);
          }
        }}
        onTouchEnd={(event) => {
          if (!touchStartRef.current) return;
          const dx = event.changedTouches[0].clientX - touchStartRef.current.x;
          const dy = event.changedTouches[0].clientY - touchStartRef.current.y;
          if (!touchStartRef.current.held) clearTimeout(reactionTimeoutRef.current);
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2) onReply(message);
          touchStartRef.current = null;
        }}
      >
        {message.replyTo ? (
          <div className={`mb-2 rounded-lg border-l-2 px-2 py-1.5 text-xs ${isOwnMessage ? "border-white/70 bg-black/10" : "border-accent bg-background/70"}`}>
            <p className="font-semibold">{message.replyTo.senderName || "Message"}</p>
            <p className="line-clamp-2 opacity-80">{message.replyTo.text || (message.replyTo.mediaType === "image" ? "Photo" : message.replyTo.mediaType === "video" ? "Video" : message.replyTo.mediaType === "sticker" ? "Sticker" : "Message")}</p>
          </div>
        ) : null}
        {message.sticker ? <p className="py-1 text-center text-6xl leading-none" role="img" aria-label="Sticker">{message.sticker}</p> : null}
        {hasImage ? (
          <img
            src={withTransform(message.imageUrl, IMAGE_TRANSFORM)}
            alt=""
            className="mb-1.5 max-h-40 max-w-full rounded-lg object-cover sm:max-h-52 sm:rounded-xl"
          />
        ) : null}
        {hasVideo ? <MessageVideo src={message.videoUrl} /> : null}
        {message.audioUrl ? <audio controls preload="none" src={message.audioUrl} className="my-1 max-w-full" /> : null}
        {message.text ? (
          <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-end gap-1">
          <button type="button" onClick={() => onReply(message)} className="hidden size-7 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="Reply to message" title="Reply">
            <CornerUpLeftIcon className="size-4" />
          </button>
          <div className="relative">
            <button type="button" onClick={() => { setShowReactions((open) => !open); clearTimeout(reactionTimeoutRef.current); }} className="hidden size-7 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="React to message" title="React">
              <SmilePlusIcon className="size-4" />
            </button>
            {showReactions ? <div className="absolute bottom-full right-0 z-20 mb-1 flex rounded-full border border-border bg-background p-1 shadow-lg">
              {QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => { onReact(message.id, emoji); setShowReactions(false); }} className="grid size-8 place-items-center rounded-full text-lg hover:bg-surface" aria-label={`React ${emoji}`}>{emoji}</button>)}
            </div> : null}
          </div>
          <button type="button" onClick={() => onPin(message.id, !isPinned)} className={`grid size-7 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100 ${isPinned ? "text-accent" : ""}`} aria-label={isPinned ? "Unpin message" : "Pin message"} title={isPinned ? "Unpin message" : "Pin message"}><PinIcon className="size-4" /></button>
          <div className="relative">
            <button type="button" onClick={() => setShowDeleteOptions((open) => !open)} className="grid size-7 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100" aria-label="Delete message" title="Delete"><Trash2Icon className="size-4" /></button>
            {showDeleteOptions ? <div className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-xl border border-border bg-background p-1 text-foreground shadow-lg"><button type="button" onClick={() => { onDelete(message._id || message.id, "me"); setShowDeleteOptions(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface">Delete for me</button>{isOwnMessage ? <button type="button" onClick={() => { onDelete(message._id || message.id, "everyone"); setShowDeleteOptions(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface">Delete for everyone</button> : null}</div> : null}
          </div>
        </div>
        {reactions.length ? <div className="-mb-1 mt-1 flex flex-wrap gap-1">
          {reactions.map(({ emoji, count, mine }) => <button key={emoji} type="button" onClick={() => onReact(message.id, emoji)} className={`rounded-full border px-1.5 py-0.5 text-xs ${mine ? "border-accent bg-accent/15" : "border-border bg-background/80"}`} aria-label={`${count} reactions with ${emoji}`}>{emoji} {count}</button>)}
        </div> : null}
        <p
          className={`mt-1 text-[11px] tabular-nums ${
            isOwnMessage ? "text-accent-foreground/75" : "text-muted"
          }`}
        >
          {message.time}
        </p>
      </div>
    </div>
  );
}
