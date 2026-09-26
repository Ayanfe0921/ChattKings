import { useEffect, useRef, useState } from "react";
import { BotIcon, LoaderIcon, SendIcon, Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

const asMessages = (data) => {
  const messages = Array.isArray(data) ? data : data?.messages;
  return Array.isArray(messages) ? messages : [];
};

export function CodexChatPanel() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    axiosInstance.get("/ai-chat")
      .then((response) => setMessages(asMessages(response.data)))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load Codex chat"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const element = bottomRef.current;
    if (typeof element?.scrollIntoView === "function") {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setMessages((current) => [...current, { role: "user", content: message, optimistic: true }]);
    setDraft("");
    setSending(true);
    try {
      const response = await axiosInstance.post("/ai-chat", { message });
      const savedMessages = asMessages(response.data);
      setMessages((current) => [...current.filter((item) => !item.optimistic), ...savedMessages]);
    } catch (error) {
      setMessages((current) => current.filter((item) => !item.optimistic));
      setDraft(message);
      toast.error(error.response?.data?.message || "Codex could not reply");
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    try {
      await axiosInstance.delete("/ai-chat");
      setMessages([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not clear chat history");
    }
  };

  return (
    <section className="mx-auto flex h-full w-full max-w-4xl flex-col border-x border-border bg-background" aria-label="Codex AI chat">
      <header className="flex h-15 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
        <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent"><BotIcon className="size-5" /></span>
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">Codex AI</h1><p className="text-xs text-muted">OpenAI Codex · messages are saved to your account</p></div>
        <button type="button" onClick={clear} disabled={!messages.length} aria-label="Clear Codex chat" title="Clear chat" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground disabled:opacity-40"><Trash2Icon className="size-4" /></button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {loading ? <p className="py-8 text-center text-sm text-muted">Loading your chat…</p> : null}
        {!loading && !messages.length ? <div className="grid h-full min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><BotIcon className="size-7" /></span><h2 className="mt-4 font-semibold">Chat with Codex</h2><p className="mt-1 text-sm text-muted">Ask a question or get help with an idea.</p></div></div> : null}
        {(Array.isArray(messages) ? messages : []).map((message, index) => <div key={`${message.createdAt || "new"}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[88%] whitespace-pre-wrap wrap-break-words rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "rounded-br-md bg-accent text-accent-foreground" : "rounded-bl-md bg-surface"}`}>{message.content}</div>
        </div>)}
        {sending ? <div className="flex"><div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3"><LoaderIcon className="size-4 animate-spin text-accent" /></div></div> : null}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex shrink-0 items-end gap-2 border-t border-border p-3 sm:px-6 sm:py-4">
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Message Codex…" className="max-h-36 min-h-11 flex-1 resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent" />
        <button type="submit" disabled={sending || !draft.trim()} aria-label="Send to Codex" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-50">{sending ? <LoaderIcon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}</button>
      </form>
      <p className="shrink-0 px-4 pb-3 text-center text-[10px] text-muted sm:px-6">Messages are sent to OpenAI to generate replies and saved to your account.</p>
    </section>
  );
}
