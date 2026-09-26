import { Avatar, Button } from "@heroui/react";
import { useState } from "react";
import { ChevronLeftIcon, PhoneIcon, Volume2Icon, VolumeXIcon, XIcon } from "lucide-react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";

import { ThemePresetPicker } from "../ThemePresentPicker";

import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";

import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { StreakIndicator } from "./StreakIndicator";
import { useCallStore } from "../../store/useCallStore";

function CallAction({ peer }) {
  const [isOpen, setIsOpen] = useState(false);
  const startCall = useCallStore((state) => state.startCall);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label="Start a call"
        aria-expanded={isOpen}
        onPress={() => setIsOpen((open) => !open)}
      >
        <PhoneIcon className="size-5" strokeWidth={2} aria-hidden />
      </Button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-40 rounded-xl border border-border bg-background p-1.5 shadow-xl">
          {["voice", "video"].map((callType) => (
            <button
              key={callType}
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (!peer) return;
                startCall(peer, callType);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm capitalize hover:bg-surface"
            >
              {callType === "video" ? "Video call" : "Voice call"}
            </button>
          ))}
          {!peer ? <p className="px-3 pb-2 text-[10px] text-muted">Select a chat first</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChatHeader() {
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);

  const { activeConversation, isLargeScreen } = useSelectedConversation();
  const streak = useChatStore((state) =>
    state.streaks[String(activeConversation?.id)],
  );

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

        <CallAction
          peer={
            activeConversation
              ? { _id: activeConversation.id, fullName: activeConversation.peer.name }
              : null
          }
        />

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
    </header>
  );
}
