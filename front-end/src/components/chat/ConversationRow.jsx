import { Avatar } from "@heroui/react";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";
import { StreakIndicator } from "./StreakIndicator";

export function ConversationRow({ user, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left ${
        selected ? "bg-accent-soft" : ""
      }`}
    >
      <AvatarWithOnlineIndicator isOnline={Boolean(user.isOnline)}>
        <Avatar className="size-12 shrink-0">
          <Avatar.Image alt={user.name} src={user.avatarUrl} />
          <Avatar.Fallback className="text-sm font-medium">{user.initials}</Avatar.Fallback>
        </Avatar>
      </AvatarWithOnlineIndicator>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{user.name}</p>
        {user.lastMessageText ? (
          <p className={`truncate text-xs ${user.unreadCount ? "font-medium text-foreground" : "text-muted"}`}>
            {user.lastMessageIsOwn ? "You: " : ""}{user.lastMessageText}
          </p>
        ) : null}
      </div>
      <StreakIndicator streak={user.streak} compact />
      {user.unreadCount > 0 ? (
        <span
          className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-[10px] font-bold text-white"
          aria-label={`${user.unreadCount} unread messages`}
          title={`${user.unreadCount} unread messages`}
        >
          {user.unreadCount > 9 ? "9+" : user.unreadCount}
        </span>
      ) : null}
    </button>
  );
}
