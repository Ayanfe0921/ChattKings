import { useState } from "react";

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😂", "🤣", "🥹", "😊", "😍", "🥰", "😘", "😎", "🤔", "😮", "😢", "😭", "😡", "🙏", "👏", "🙌", "👍", "👎", "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "🎉", "✨", "💯", "✅", "🤝", "👋", "💐", "🌹", "🐱", "🐶", "🫶"];
const STICKERS = ["🥰", "😂", "😍", "🤗", "😎", "🥳", "😭", "😴", "🤔", "😱", "🙏", "👏", "💖", "💯", "🔥", "🎉", "👋", "🫶", "🐱", "🐶", "🌹", "💐", "✨", "🤝"];

export function EmojiStickerPicker({ onEmoji, onSticker }) {
  const [tab, setTab] = useState("emoji");
  const items = tab === "emoji" ? EMOJIS : STICKERS;
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl border border-border bg-background p-2 shadow-xl sm:w-80">
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        <button type="button" onClick={() => setTab("emoji")} className={`rounded-lg py-1.5 text-xs font-semibold ${tab === "emoji" ? "bg-background text-accent shadow-sm" : "text-muted"}`}>Emojis</button>
        <button type="button" onClick={() => setTab("sticker")} className={`rounded-lg py-1.5 text-xs font-semibold ${tab === "sticker" ? "bg-background text-accent shadow-sm" : "text-muted"}`}>Stickers</button>
      </div>
      <div className="grid max-h-52 grid-cols-7 gap-1 overflow-y-auto">
        {items.map((item, index) => <button key={`${item}-${index}`} type="button" onClick={() => tab === "emoji" ? onEmoji(item) : onSticker(item)} className={`grid place-items-center rounded-lg hover:bg-surface ${tab === "emoji" ? "size-9 text-xl" : "aspect-square text-3xl"}`} aria-label={tab === "emoji" ? `Insert ${item}` : `Send ${item} sticker`}>{item}</button>)}
      </div>
      {tab === "sticker" ? <p className="mt-2 text-center text-[10px] text-muted">Tap a sticker to send it</p> : null}
    </div>
  );
}
