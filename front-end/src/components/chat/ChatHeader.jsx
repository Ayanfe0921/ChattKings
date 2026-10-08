import { Avatar, Button } from "@heroui/react";
import { useState } from "react";
import { ChevronLeftIcon, Volume2Icon, VolumeXIcon, XIcon, SearchIcon, PlusIcon, BanIcon, DownloadIcon, GaugeIcon } from "lucide-react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";

import { ThemePresetPicker } from "../ThemePresentPicker";

import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";

import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { StreakIndicator } from "./StreakIndicator";
import { useCallStore } from "../../store/useCallStore";
import { PhoneIcon } from "lucide-react";
import { CheckIcon, UsersIcon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";

function CallAction({ peer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const conversations = useChatStore((state) => state.conversations);
  const authUser = useAuthStore((state) => state.authUser);
  const startCall = useCallStore((state) => state.startCall);
  const canCall = Boolean(navigator.onLine && peer?.isOnline);
  const callers = authUser?.allowedCallers || [];
  const canManageCallers = authUser?.showReadReceipts === false;
  const open = () => { setSelected(callers.map(String)); setIsOpen(true); };
  const save = async () => {
    setSaving(true);
    try {
      const response = await axiosInstance.patch("/messages/settings/allowed-callers", { callers: selected });
      useAuthStore.setState((state) => ({ authUser: { ...state.authUser, allowedCallers: response.data.allowedCallers } }));
      toast.success("Call access updated"); setIsOpen(false);
    } catch (error) { toast.error(error.response?.data?.message || "Could not update call access"); }
    finally { setSaving(false); }
  };

  return <div className="relative">
    {peer || canManageCallers ? <Button variant="ghost" size="sm" isIconOnly aria-label={peer ? "Call options" : "Select who can call me"} title={peer ? "Call options" : "Select who can call me"} aria-expanded={isOpen || callMenuOpen} onPress={() => peer ? setCallMenuOpen((value) => !value) : open()}>
      <PhoneIcon className="size-5" strokeWidth={2} aria-hidden />
    </Button> : null}
    {callMenuOpen ? <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-background p-1.5 shadow-xl">{peer && canCall ? ["voice", "video"].map((callType) => <button key={callType} type="button" onClick={() => { setCallMenuOpen(false); startCall({ _id: peer.id, fullName: peer.name, isOnline: peer.isOnline }, callType); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm capitalize hover:bg-surface">{callType === "video" ? "Video call" : "Voice call"}</button>) : peer ? <p className="px-3 py-2 text-xs text-muted">Calling is available when you’re online together.</p> : null}{canManageCallers ? <button type="button" onClick={() => { setCallMenuOpen(false); open(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">Select who can call me</button> : null}</div> : null}
    {isOpen && canManageCallers ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="callers-title" className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl border border-border bg-background text-foreground shadow-2xl"><header className="border-b border-border p-5"><h2 id="callers-title" className="flex items-center gap-2 text-lg font-semibold"><UsersIcon className="size-5 text-accent"/>Select who can call me</h2><p className="mt-1 text-sm text-muted">With read receipts off, only the people selected here can call you.</p></header><div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">{conversations.length ? conversations.map((person) => { const id = String(person._id); const checked = selected.includes(id); return <button key={id} type="button" aria-pressed={checked} onClick={() => setSelected((items) => checked ? items.filter((item) => item !== id) : [...items, id])} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-surface"><span className={`grid size-5 place-items-center rounded-md border ${checked ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>{checked ? <CheckIcon className="size-4"/> : null}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{person.fullName}</span><span className="text-xs text-muted">{person.lastMessageAt ? new Date(person.lastMessageAt).toLocaleDateString() : "Chat"}</span></button>; }) : <p className="p-5 text-center text-sm text-muted">People you’ve chatted with will appear here.</p>}</div><footer className="flex justify-end gap-2 border-t border-border p-4"><Button variant="ghost" onPress={() => setIsOpen(false)}>Cancel</Button><Button isDisabled={saving} onPress={save}>{saving ? "Saving…" : "OK"}</Button></footer></section></div> : null}
  </div>;
}

export function ChatHeader() {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reportOnBlock, setReportOnBlock] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const messageSearchQuery = useChatStore((state) => state.messageSearchQuery);
  const setMessageSearchQuery = useChatStore((state) => state.setMessageSearchQuery);
  const setContactTag = useChatStore((state) => state.setContactTag);
  const users = useChatStore((state) => state.users);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);
  const isDataSaverEnabled = useChatStore((state) => state.isDataSaverEnabled);
  const setDataSaverEnabled = useChatStore((state) => state.setDataSaverEnabled);
  const setContactBlocked = useChatStore((state) => state.setContactBlocked);

  const { activeConversation, isLargeScreen } = useSelectedConversation();
  const streak = useChatStore((state) =>
    state.streaks[String(activeConversation?.id)],
  );

  const exportConversation = () => {
    if (!activeConversation) return;
    const lines = activeConversation.messages.map((message) => ({
      timestamp: message.createdAt || message.time,
      sender: message.role === "me" ? "You" : activeConversation.peer.name,
      text: message.text || "",
      attachment: message.imageUrl || message.videoUrl || message.audioUrl || null,
      sticker: message.sticker || null,
    }));
    const blob = new Blob([JSON.stringify({ conversation: activeConversation.peer.name, exportedAt: new Date().toISOString(), messages: lines }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chattkings-${activeConversation.peer.name.replace(/[^a-z0-9-_]/gi, "-")}-history.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
      {activeConversation && !isLargeScreen ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          onPress={() => setActiveConversationId(null)}
        >
          <ChevronLeftIcon className="size-6" strokeWidth={2.25} />
        </Button>
      ) : null}

      {activeConversation ? (
        <>
          <div className="relative">
            {users.find((user) => String(user._id) === String(activeConversation.id))?.contactTag ? null : <Button variant="ghost" size="sm" isIconOnly aria-label="Add chat tag" onPress={() => { setTagDraft(""); setTagEditorOpen((open) => !open); }}><PlusIcon className="size-5" /></Button>}
            {tagEditorOpen ? <form className="absolute left-0 top-full z-30 mt-2 flex w-64 gap-2 rounded-xl border border-border bg-background p-3 shadow-xl" onSubmit={(event) => { event.preventDefault(); setContactTag(activeConversation.id, tagDraft); setTagEditorOpen(false); }}><input autoFocus value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Friend, family…" maxLength={40} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" /><button className="rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground">Save</button></form> : null}
          </div>
          <AvatarWithOnlineIndicator isOnline={Boolean(activeConversation.peer.isOnline)}>
            <Avatar className="size-9 shrink-0">
              <Avatar.Image
                alt={activeConversation.peer.name}
                src={activeConversation.peer.avatarUrl}
              />
              <Avatar.Fallback className="text-sm font-medium">
                {activeConversation.peer.initials}
              </Avatar.Fallback>
            </Avatar>
          </AvatarWithOnlineIndicator>

          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {activeConversation.peer.name}
            </p>
            <p className="truncate text-xs text-muted">
              {activeConversation.peer.isOnline ? (
                <span className="font-medium text-success">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
          <StreakIndicator streak={streak} compact />
        </>
      ) : (
        <div className="flex flex-1 items-center gap-2.5 sm:text-left">
          <AppLogo size={36} className="rounded-[9px]" />
          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[13px] font-medium text-muted">Select a conversation</p>
          </div>
        </div>
      )}

      <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1">
        <div className="hidden min-[400px]:contents">
          <WallpaperPicker />
          <ThemePresetPicker />
        </div>

        <ThemeToggle />

        <Button variant={isDataSaverEnabled ? "primary" : "ghost"} size="sm" isIconOnly aria-label={isDataSaverEnabled ? "Turn off data saver" : "Turn on data saver"} aria-pressed={isDataSaverEnabled} title="Data saver" onPress={() => setDataSaverEnabled(!isDataSaverEnabled)}><GaugeIcon className="size-5"/></Button>

        <CallAction peer={activeConversation ? { id: activeConversation.id, name: activeConversation.peer.name, isOnline: activeConversation.peer.isOnline } : null} />

        {activeConversation ? <Button variant="ghost" size="sm" isIconOnly aria-label="Export this chat history as JSON" title="Export chat history" onPress={exportConversation}><DownloadIcon className="size-5" /></Button> : null}
        {activeConversation ? <Button variant="ghost" size="sm" isIconOnly aria-label="Search messages in this chat" aria-pressed={messageSearchOpen} onPress={() => { setMessageSearchOpen((open) => !open); setMessageSearchQuery(""); }}><SearchIcon className="size-5" /></Button> : null}

        {activeConversation ? <Button variant="ghost" size="sm" isIconOnly aria-label={activeConversation.peer.isBlocked ? "Unblock this person" : "Block this person"} title={activeConversation.peer.isBlocked ? "Unblock this person" : "Block this person"} onPress={() => activeConversation.peer.isBlocked ? setContactBlocked(activeConversation.id, false) : setBlockDialogOpen(true)}><BanIcon className={`size-5 ${activeConversation.peer.isBlocked ? "text-danger" : ""}`} /></Button> : null}

        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="shrink-0"
          aria-pressed={isSoundEnabled}
          onPress={() => setSoundEnabled(!isSoundEnabled)}
        >
          {isSoundEnabled ? (
            <Volume2Icon className="size-5.5" strokeWidth={2} aria-hidden />
          ) : (
            <VolumeXIcon className="size-5.5" strokeWidth={2} aria-hidden />
          )}
        </Button>

        {activeConversation ? (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="shrink-0"
            aria-label="Close chat"
            onPress={() => setActiveConversationId(null)}
          >
            <XIcon className="size-5.5" strokeWidth={2} aria-hidden />
          </Button>
        ) : null}
      </div>
      {messageSearchOpen && activeConversation ? <div className="basis-full px-2 pb-1"><input autoFocus value={messageSearchQuery} onChange={(event) => setMessageSearchQuery(event.target.value)} placeholder="Search messages in this chat" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></div> : null}
      {blockDialogOpen && activeConversation ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBlockDialogOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="block-contact-title" className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 text-foreground shadow-2xl"><h2 id="block-contact-title" className="text-lg font-semibold">Block {activeConversation.peer.name}?</h2><p className="mt-2 text-sm text-muted">They won’t be able to send you messages, and you won’t be able to message them. Your chat history will stay saved.</p><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-surface p-3"><input type="checkbox" checked={reportOnBlock} onChange={(event) => setReportOnBlock(event.target.checked)} className="size-4 accent-[var(--accent)]"/><span><span className="block text-sm font-medium">Also report to ChattKings</span><span className="block text-xs text-muted">Ten unique reports from different accounts automatically suspend the reported account.</span></span></label><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onPress={() => { setBlockDialogOpen(false); setReportOnBlock(false); }}>No</Button><Button variant="danger" onPress={async () => { const done = await setContactBlocked(activeConversation.id, true, reportOnBlock); if (done) { setBlockDialogOpen(false); setReportOnBlock(false); } }}>Yes, block</Button></div></section></div> : null}
    </header>
  );
}

