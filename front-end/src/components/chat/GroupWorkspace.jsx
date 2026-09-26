import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CornerUpLeftIcon, LoaderIcon, PlusIcon, SendIcon, SmilePlusIcon, UsersIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { EmojiStickerPicker } from "./EmojiStickerPicker";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

export function GroupWorkspace() {
  const socket = useAuthStore((state) => state.socket);
  const authUser = useAuthStore((state) => state.authUser);
  const [groups, setGroups] = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionFor, setReactionFor] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const bottomRef = useRef(null);

  const loadGroups = async () => {
    try {
      const [groupResponse, eligibleResponse] = await Promise.all([
        axiosInstance.get("/groups"),
        axiosInstance.get("/groups/eligible-users"),
      ]);
      setGroups(groupResponse.data);
      setEligibleUsers(eligibleResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load groups");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleCreated = (group) => {
      setGroups((current) => current.some((item) => item._id === group._id) ? current : [group, ...current]);
    };
    socket.on("group:created", handleCreated);
    return () => socket.off("group:created", handleCreated);
  }, [socket]);

  useEffect(() => {
    if (!activeGroup) return;
    let stillActive = true;
    const groupId = activeGroup._id;
    socket?.emit("group:join", { groupId });
    setMessages([]);
    axiosInstance.get(`/groups/${groupId}/messages`)
      .then((response) => { if (stillActive) setMessages(response.data); })
      .catch((error) => toast.error(error.response?.data?.message || "Could not load group messages"));
    const handleMessage = (message) => {
      if (String(message.groupId) !== String(groupId)) return;
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
    };
    const handleUpdatedMessage = (message) => {
      if (String(message.groupId) !== String(groupId)) return;
      setMessages((current) => current.map((item) => item._id === message._id ? message : item));
    };
    socket?.on("group:message", handleMessage);
    socket?.on("messageUpdated", handleUpdatedMessage);
    return () => {
      stillActive = false;
      socket?.off("group:message", handleMessage);
      socket?.off("messageUpdated", handleUpdatedMessage);
      socket?.emit("group:leave", { groupId });
    };
  }, [activeGroup, socket]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const createGroup = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const response = await axiosInstance.post("/groups", { name: groupName, memberIds: selectedMembers });
      setGroups((current) => [response.data, ...current.filter((item) => item._id !== response.data._id)]);
      setActiveGroup(response.data);
      setGroupName("");
      setSelectedMembers([]);
      setShowCreate(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create group");
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeGroup) return;
    setIsSending(true);
    try {
      const response = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, { text, replyToId: replyingTo?._id });
      setMessages((current) => current.some((item) => item._id === response.data._id) ? current : [...current, response.data]);
      setDraft("");
      setReplyingTo(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send group message");
    } finally {
      setIsSending(false);
    }
  };

  const sendSticker = async (sticker) => {
    setIsPickerOpen(false);
    setIsSending(true);
    try {
      const response = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, { sticker, replyToId: replyingTo?._id });
      setMessages((current) => current.some((item) => item._id === response.data._id) ? current : [...current, response.data]);
      setReplyingTo(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send sticker");
    } finally {
      setIsSending(false);
    }
  };

  const reactToMessage = async (messageId, emoji) => {
    setReactionFor(null);
    try {
      await axiosInstance.patch(`/messages/${messageId}/reaction`, { emoji });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not react to message");
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className={`${activeGroup ? "hidden sm:flex" : "flex"} w-full shrink-0 flex-col border-r border-border bg-background sm:w-72`}>
        <header className="flex items-center justify-between border-b border-border px-4 py-4">
          <div><h1 className="font-semibold">Groups</h1><p className="mt-0.5 text-xs text-muted">Group conversations</p></div>
          <button type="button" onClick={() => setShowCreate(true)} title="Create group" className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground"><PlusIcon className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading ? <p className="px-3 py-5 text-center text-sm text-muted">Loading groups…</p> : null}
          {!isLoading && groups.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">No groups yet. Create one to start chatting.</p> : null}
          {groups.map((group) => (
            <button type="button" key={group._id} onClick={() => setActiveGroup(group)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface ${activeGroup?._id === group._id ? "bg-accent/10" : ""}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><UsersIcon className="size-5" /></span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="text-xs text-muted">{group.members?.length || 0} members</span></span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${activeGroup ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col bg-background`}>
        {activeGroup ? <>
          <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-3 sm:px-5">
            <button type="button" onClick={() => setActiveGroup(null)} className="grid size-9 place-items-center rounded-lg hover:bg-surface sm:hidden" aria-label="Back to groups"><ArrowLeftIcon className="size-5" /></button>
            <span className="grid size-9 place-items-center rounded-full bg-accent/10 text-accent"><UsersIcon className="size-4" /></span>
            <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{activeGroup.name}</h2><p className="text-xs text-muted">{activeGroup.members?.length || 0} members · max 50</p></div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
            {messages.map((message) => {
              const own = String(message.senderId?._id || message.senderId) === String(authUser?._id);
              return <div key={message._id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${own ? "rounded-br-md bg-accent text-accent-foreground" : "rounded-bl-md bg-surface"}`}>
                  {!own ? <p className="mb-1 text-[11px] font-semibold text-accent">{message.senderId?.fullName || "Member"}</p> : null}
                  {message.replyTo ? <div className="mb-2 rounded-lg border-l-2 border-accent bg-background/60 px-2 py-1 text-xs"><p className="font-semibold">{message.replyTo.senderName}</p><p className="truncate opacity-75">{message.replyTo.text || (message.replyTo.mediaType === "image" ? "Photo" : message.replyTo.mediaType === "video" ? "Video" : "Message")}</p></div> : null}
                  {message.sticker ? <p className="py-1 text-center text-6xl leading-none" role="img" aria-label="Sticker">{message.sticker}</p> : null}
                  {message.text ? <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p> : null}
                  <time className="mt-1 block text-right text-[10px] opacity-65">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <button type="button" onClick={() => setReplyingTo(message)} className="grid size-7 place-items-center rounded-full opacity-70 hover:bg-black/10" aria-label="Reply to group message"><CornerUpLeftIcon className="size-4" /></button>
                    <div className="relative"><button type="button" onClick={() => setReactionFor((id) => id === message._id ? null : message._id)} className="grid size-7 place-items-center rounded-full opacity-70 hover:bg-black/10" aria-label="React to group message"><SmilePlusIcon className="size-4" /></button>
                      {reactionFor === message._id ? <div className="absolute bottom-full right-0 z-20 mb-1 flex rounded-full border border-border bg-background p-1 shadow-lg">{QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => reactToMessage(message._id, emoji)} className="grid size-8 place-items-center rounded-full text-lg hover:bg-surface" aria-label={`React ${emoji}`}>{emoji}</button>)}</div> : null}
                    </div>
                  </div>
                  {message.reactions?.length ? <div className="mt-1 flex flex-wrap gap-1">{Object.entries(message.reactions.reduce((counts, reaction) => ({ ...counts, [reaction.emoji]: (counts[reaction.emoji] || 0) + 1 }), {})).map(([emoji, count]) => <button key={emoji} type="button" onClick={() => reactToMessage(message._id, emoji)} className="rounded-full border border-border bg-background/80 px-1.5 py-0.5 text-xs">{emoji} {count}</button>)}</div> : null}
                </div>
              </div>;
            })}
            <div ref={bottomRef} />
          </div>
          <div className="shrink-0 border-t border-border p-3 sm:px-5">
          {replyingTo ? <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-accent bg-surface px-3 py-2"><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-accent">Replying to {replyingTo.senderId?.fullName || "message"}</p><p className="truncate text-xs text-muted">{replyingTo.text || "Message"}</p></div><button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="grid size-7 place-items-center rounded-full hover:bg-background"><XIcon className="size-4" /></button></div> : null}
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <div className="relative shrink-0"><button type="button" onClick={() => setIsPickerOpen((open) => !open)} aria-label="Open emoji and sticker picker" className="grid size-10 place-items-center rounded-full text-accent hover:bg-surface"><SmilePlusIcon className="size-5" /></button>{isPickerOpen ? <EmojiStickerPicker onEmoji={(emoji) => setDraft((current) => `${current}${emoji}`)} onSticker={sendSticker} /> : null}</div>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={6000} placeholder={`Message ${activeGroup.name}`} className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent" />
            <button type="submit" disabled={isSending || !draft.trim()} aria-label="Send group message" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-50">{isSending ? <LoaderIcon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}</button>
          </form>
          </div>
        </> : <div className="grid flex-1 place-items-center p-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><UsersIcon className="size-7" /></span><h2 className="mt-4 font-semibold">Your group chats</h2><p className="mt-1 text-sm text-muted">Choose a group or create one to start a conversation.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Create group</button></div></div>}
      </section>

      {showCreate ? <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
        <form onSubmit={createGroup} className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl">
          <header className="border-b border-border px-5 py-4"><h2 className="font-semibold">Create a group</h2><p className="mt-1 text-xs text-muted">Invite people you have chatted with for at least 3 days.</p></header>
          <div className="space-y-3 p-5">
            <input autoFocus value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={60} placeholder="Group name" required className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent" />
            <p className="text-xs text-muted">Select members · up to 49 others (50 total)</p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {eligibleUsers.length ? eligibleUsers.map((user) => <label key={user._id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface">
                <input type="checkbox" checked={selectedMembers.includes(user._id)} disabled={!selectedMembers.includes(user._id) && selectedMembers.length >= 49} onChange={(event) => setSelectedMembers((current) => event.target.checked ? [...current, user._id] : current.filter((id) => id !== user._id))} className="accent-[var(--color-accent)]" />
                <span className="grid size-8 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{user.fullName?.slice(0, 1).toUpperCase()}</span><span className="text-sm">{user.fullName}</span>
              </label>) : <p className="py-5 text-center text-sm text-muted">No eligible contacts yet. Chat with someone on at least 3 separate days over 3 days first.</p>}
            </div>
          </div>
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-full px-4 py-2 text-sm hover:bg-surface">Cancel</button>
            <button type="submit" disabled={isCreating || !groupName.trim() || !selectedMembers.length} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">{isCreating ? "Creating…" : "Create group"}</button>
          </footer>
        </form>
      </div> : null}
    </div>
  );
}
