import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getNewYearTarget() {
  const year = new Date().getFullYear() + 1;
  return {
    year,
    date: new Date(year, 0, 1, 0, 0, 0),
  };
}

function TimeLeft({ eventAt, now }) {
  const remaining = new Date(eventAt).getTime() - now;
  if (remaining <= 0) {
    return <p className="mt-4 text-sm font-semibold text-accent">The day is here!</p>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const units = [
    ["Days", Math.floor(totalSeconds / 86_400)],
    ["Hours", Math.floor(totalSeconds / 3_600) % 24],
    ["Minutes", Math.floor(totalSeconds / 60) % 60],
    ["Seconds", totalSeconds % 60],
  ];

  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
      {units.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-background/70 px-1 py-2 text-center sm:px-2">
          <p className="text-lg font-bold tabular-nums text-accent sm:text-2xl">
            {String(value).padStart(2, "0")}
          </p>
          <p className="text-[9px] uppercase tracking-wide text-muted sm:text-[10px]">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function CountdownPanel() {
  const [countdowns, setCountdowns] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const newYear = useMemo(getNewYearTarget, []);

  const loadCountdowns = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/countdowns", {
        params: { year: newYear.year, newYearAt: newYear.date.toISOString() },
      });
      setCountdowns(res.data.countdowns);
      res.data.notifications.forEach((notice) => toast.success(notice.text));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load countdowns");
    } finally {
      setIsLoading(false);
    }
  }, [newYear.date, newYear.year]);

  useEffect(() => {
    loadCountdowns();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [loadCountdowns]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim() || !eventAt) return;
    setIsSaving(true);
    try {
      const res = await axiosInstance.post("/countdowns", {
        title: title.trim(),
        eventAt: new Date(eventAt).toISOString(),
      });
      setCountdowns((items) => [...items, res.data].sort(
        (a, b) => new Date(a.eventAt) - new Date(b.eventAt),
      ));
      setTitle("");
      setEventAt("");
      setIsAdding(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create countdown");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (countdownId) => {
    try {
      await axiosInstance.delete(`/countdowns/${countdownId}`);
      setCountdowns((items) => items.filter((item) => item._id !== countdownId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove countdown");
    }
  };

  return (
    <section className="space-y-3 p-3" aria-label="Countdowns">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-sm font-semibold">Countdowns</h2>
          <p className="text-xs text-muted">Keep the dates you care about close.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding((value) => !value)}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
          aria-label={isAdding ? "Close countdown form" : "Add countdown"}
        >
          {isAdding ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleCreate} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          <label className="block text-xs font-medium text-muted">
            What are you counting down to?
            <input
              required
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A friend's birthday"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="block text-xs font-medium text-muted">
            Date and time
            <input
              required
              type="datetime-local"
              min={localDateTimeValue(new Date())}
              value={eventAt}
              onChange={(event) => setEventAt(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Create countdown"}
          </button>
        </form>
      ) : null}

      {isLoading ? <p className="px-2 py-4 text-center text-sm text-muted">Loading countdowns…</p> : null}
      {!isLoading && countdowns.length === 0 ? (
        <p className="px-2 py-5 text-center text-sm text-muted">Add an event to start counting down.</p>
      ) : null}

      <div className="space-y-2">
        {countdowns.map((countdown) => (
          <article
            key={countdown._id}
            className={`relative overflow-hidden rounded-2xl border border-border p-3 text-foreground ${
              countdown.isDefault
                ? "bg-linear-to-br from-accent/20 via-accent/10 to-surface"
                : "bg-surface"
            }`}
          >
            {!countdown.isDefault ? (
              <button
                type="button"
                onClick={() => handleDelete(countdown._id)}
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
                aria-label={`Delete ${countdown.title}`}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            ) : null}
            <p className="pr-8 text-sm font-semibold">{countdown.title}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {new Date(countdown.eventAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <TimeLeft eventAt={countdown.eventAt} now={now} />
          </article>
        ))}
      </div>
    </section>
  );
}
