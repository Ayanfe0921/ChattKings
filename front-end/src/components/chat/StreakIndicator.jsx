import { Cat, TreePine } from "lucide-react";

function CandleIcon({ days }) {
  const remainingHeight = Math.max(2, 25 * (1 - days / 100));

  return (
    <svg viewBox="0 0 24 32" className="size-6 shrink-0" aria-hidden="true">
      <path
        d="M12 1C9 5 8 7 10 10c-3-1-4-3-3-5-4 4-3 9 1 11h8c4-3 3-8-1-11 1 3 0 4-2 5 1-3 1-6-1-9Z"
        className="fill-accent animate-[streak-flame_550ms_ease-in-out_infinite_alternate] motion-reduce:animate-none"
      />
      <rect x="6" y="13" width="12" height="18" rx="3" className="fill-accent/25" />
      <rect
        x="7"
        y={31 - remainingHeight}
        width="10"
        height={remainingHeight}
        rx="2"
        className="fill-accent"
      />
      <path d="M8 18h8M8 22h8" className="stroke-background/70" strokeWidth="1" />
    </svg>
  );
}

export function StreakIndicator({ streak, compact = false }) {
  const days = streak?.days || 0;
  if (!days) return null;

  let icon;
  if (days < 100) {
    icon = <CandleIcon days={days} />;
  } else if (days < 500) {
    icon = (
      <span className="grid size-7 place-items-center rounded-full bg-accent/15">
        <span className="streak-ball-motion size-3.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)] motion-reduce:animate-none" />
      </span>
    );
  } else if (days < 1000) {
    icon = (
      <span className="relative grid size-7 place-items-center text-accent">
        <TreePine className="size-6 fill-accent/15" aria-hidden="true" />
        <span className="absolute -top-1.5 animate-[streak-flame_450ms_ease-in-out_infinite_alternate] motion-reduce:animate-none" aria-hidden="true">🔥</span>
      </span>
    );
  } else if (days < 5000) {
    icon = (
      <span className="relative grid size-7 place-items-center text-accent">
        <Cat className="size-6 animate-[streak-bounce_1.4s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden="true" />
        <span className="absolute -right-5 -top-2 animate-[streak-meow_2.4s_ease-out_infinite] text-[9px] font-bold text-accent motion-reduce:animate-none">meow</span>
      </span>
    );
  } else {
    icon = (
      <span className="relative flex h-7 w-10 items-center justify-center" aria-hidden="true">
        <span className="animate-[streak-cat_1.5s_ease-in-out_infinite] text-base leading-none">🐈</span>
        <span className="absolute size-1.5 rounded-full bg-accent animate-[streak-ball_1.5s_ease-in-out_infinite]" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-accent ${compact ? "text-[10px]" : "text-xs"}`}
      title={`${days}-day photo streak`}
      aria-label={`${days}-day photo streak`}
    >
      {icon}
      <span className="font-semibold tabular-nums">{days}</span>
    </span>
  );
}
