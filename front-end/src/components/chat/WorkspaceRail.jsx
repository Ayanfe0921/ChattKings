import {
  ClapperboardIcon,
  MessageCircleIcon,
  PhoneIcon,
  TimerIcon,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

const sections = [
  { id: "chat", label: "Chats", Icon: MessageCircleIcon },
  { id: "countdowns", label: "Countdowns", Icon: TimerIcon },
  { id: "calls", label: "Call history", Icon: PhoneIcon },
  { id: "posts", label: "Posts", Icon: ClapperboardIcon },
];

export function WorkspaceRail() {
  const workspaceSection = useChatStore((state) => state.workspaceSection);
  const setWorkspaceSection = useChatStore((state) => state.setWorkspaceSection);

  return (
    <nav
      aria-label="Main sections"
      className="group z-20 flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface/70 py-3 transition-[width] duration-200 hover:w-44 hover:items-stretch focus-within:w-44"
    >
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setWorkspaceSection(id)}
          aria-current={workspaceSection === id ? "page" : undefined}
          title={label}
          className={`mx-auto flex h-11 w-11 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-xl transition-all duration-200 group-hover:mx-2 group-hover:w-[calc(100%-1rem)] group-hover:justify-start focus-visible:mx-2 focus-visible:w-[calc(100%-1rem)] focus-visible:justify-start ${
            workspaceSection === id
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:bg-accent/10 hover:text-foreground"
          }`}
        >
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover:max-w-32 group-hover:opacity-100 group-focus-within:max-w-32 group-focus-within:opacity-100">
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
