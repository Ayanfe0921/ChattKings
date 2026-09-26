import { useEffect, useState } from "react";
import { LoaderIcon, MessageCircleIcon, QuoteIcon, RefreshCwIcon, ShareIcon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useChatStore } from "../../store/useChatStore";

export function QuotesPanel() {
  const conversations = useChatStore((state) => state.conversations);
  const getConversations = useChatStore((state) => state.getConversations);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setWorkspaceSection = useChatStore((state) => state.setWorkspaceSection);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [sharingTo, setSharingTo] = useState("");

  const loadQuote = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/quotes/random");
      setQuote(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not generate a quote");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuote();
    getConversations();
  }, [getConversations]);

  const postQuote = async () => {
    if (!quote) return;
    setPosting(true);
    try {
      await axiosInstance.post("/posts/quote", quote);
      toast.success("Quote posted to your feed");
      setWorkspaceSection("posts");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not post quote");
    } finally {
      setPosting(false);
    }
  };

  const shareQuote = async () => {
    if (!quote || !sharingTo) return;
    try {
      const response = await axiosInstance.post("/quotes/share", { ...quote, peerId: sharingTo });
      useChatStore.setState((state) => ({
        messages: String(state.activeConversationId) === String(sharingTo)
          ? [...state.messages.filter((message) => String(message._id) !== String(response.data._id)), response.data]
          : state.messages,
      }));
      getConversations();
      toast.success("Quote shared in your chat");
      setActiveConversationId(sharingTo);
      setWorkspaceSection("chat");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not share quote");
    }
  };

  return (
    <section className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center p-4 sm:p-8" aria-label="Quote generator">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-5 shadow-sm sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent"><QuoteIcon className="size-5" /></span>
          <div><h1 className="text-xl font-semibold">Quote of the day</h1><p className="text-xs text-muted">Find a thought to share</p></div>
        </div>
        <div className="my-8 min-h-40 border-l-2 border-accent pl-5 sm:pl-7">
          {loading ? <div className="flex min-h-40 items-center justify-center"><LoaderIcon className="size-6 animate-spin text-accent" /></div> : quote ? <>
            <blockquote className="text-xl font-medium leading-relaxed sm:text-2xl">“{quote.text}”</blockquote>
            {quote.author ? <p className="mt-4 text-right text-sm text-muted">— {quote.author}</p> : null}
          </> : <p className="text-sm text-muted">Generate a quote to get started.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadQuote} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:opacity-50"><RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />New quote</button>
          <button type="button" onClick={postQuote} disabled={!quote || posting} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50">{posting ? <LoaderIcon className="size-4 animate-spin" /> : <ShareIcon className="size-4" />}Post to feed</button>
        </div>
        <div className="mt-7 border-t border-border pt-5">
          <p className="text-sm font-semibold">Share in a conversation</p>
          <p className="mt-1 text-xs text-muted">Only people you already have a chat with are listed.</p>
          {conversations.length ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select value={sharingTo} onChange={(event) => setSharingTo(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent">
              <option value="">Choose a chat</option>
              {conversations.map((person) => <option key={person._id} value={person._id}>{person.fullName}</option>)}
            </select>
            <button type="button" onClick={shareQuote} disabled={!quote || !sharingTo} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:opacity-50"><MessageCircleIcon className="size-4" />Share in chat</button>
          </div> : <p className="mt-3 rounded-xl bg-surface px-3 py-3 text-xs text-muted">Start a conversation first to share a quote directly.</p>}
        </div>
      </div>
    </section>
  );
}
