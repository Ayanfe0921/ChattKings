import { useEffect, useState } from "react";
import { PhoneCallIcon, PhoneIncomingIcon, PhoneMissedIcon, VideoIcon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";

function formatDuration(seconds = 0) {
  if (!seconds) return "No answer";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function CallHistoryPanel() {
  const authUser = useAuthStore((state) => state.authUser);
  const users = useChatStore((state) => state.users);
  const setWorkspaceSection = useChatStore((state) => state.setWorkspaceSection);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    axiosInstance
      .get("/calls/history")
      .then((res) => setCalls(res.data))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load calls"));
  }, []);

  return (
    <section className="mx-auto w-full max-w-3xl p-4 sm:p-6" aria-label="Call history">
      <h1 className="text-xl font-semibold">Call history</h1>
      <p className="mt-1 text-sm text-muted">Recent voice and video calls.</p>
      {calls.length ? (
        <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-background">
          {calls.map((call) => {
            const outgoing = String(call.callerId?._id) === String(authUser?._id);
            const person = outgoing ? call.receiverId : call.callerId;
            const missed = call.status === "missed" || call.status === "declined";
            const peer = users.find((user) => String(user._id) === String(person?._id));
            const Icon = missed ? PhoneMissedIcon : outgoing ? PhoneCallIcon : PhoneIncomingIcon;

            return (
              <button
                key={call._id}
                type="button"
                onClick={() => {
                  if (!person?._id) return;
                  setActiveConversationId(person._id);
                  setWorkspaceSection("chat");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${missed ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person?.fullName || peer?.fullName || "Chat user"}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {call.callType === "video" ? <VideoIcon className="size-3" /> : <PhoneCallIcon className="size-3" />}
                    <span className="capitalize">{call.status}</span>
                    <span>·</span>
                    {formatDuration(call.durationSeconds)}
                  </span>
                </span>
                <time className="shrink-0 text-[10px] text-muted">
                  {new Date(call.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </time>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          Your incoming, outgoing, and missed calls will show here.
        </p>
      )}
    </section>
  );
}
