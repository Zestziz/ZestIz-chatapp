import { useState, useRef, useEffect } from "react";
import { Avatar, Button } from "@heroui/react";
import { BellIcon, BellOffIcon, ChevronLeftIcon, MoreHorizontalIcon, PinIcon, SearchIcon, Volume2Icon, VolumeXIcon, XIcon, MoreVertical, UserMinus, Ban } from "lucide-react";
import { AppLogo } from "../AppLogo";
import { AvatarWithOnlineIndicator } from "./AvatarWithOnlineIndicator";

import { ThemePresetPicker } from "../ThemePresetPicker";
import { ThemeToggle } from "../ThemeToggle";
import { WallpaperPicker } from "../WallpaperPicker";

import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { formatLastSeen, formatMessageTime } from "../../lib/utils";
import { GroupDetailsModal } from "./GroupDetailsModal";
import { PinnedMessagesPanel } from "./PinnedMessagesPanel";

export function ChatHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchInput, setMessageSearchInput] = useState("");
  const [messageSearchConversationId, setMessageSearchConversationId] = useState(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setSoundEnabled = useChatStore((state) => state.setSoundEnabled);
  const notificationSettings = useAuthStore((state) => state.notificationSettings);
  const enableNotifications = useAuthStore((state) => state.enableNotifications);
  const setNotificationSettings = useAuthStore((state) => state.setNotificationSettings);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);
  const searchMessages = useChatStore((state) => state.searchMessages);
  const searchResults = useChatStore((state) => state.searchResults);
  const isSearchingMessages = useChatStore((state) => state.isSearchingMessages);
  const clearMessageSearch = useChatStore((state) => state.clearMessageSearch);
  const setSearchTargetMessageId = useChatStore((state) => state.setSearchTargetMessageId);
  const selectedUserFromStore = useChatStore((state) => state.selectedUser);
  const selectedGroup = useChatStore((state) => state.selectedGroup);

  const friends = useFriendStore((state) => state.friends);
  const removeFriend = useFriendStore((state) => state.removeFriend);
  const blockUser = useFriendStore((state) => state.blockUser);

  const { activeConversation, isLargeScreen } = useSelectedConversation();
  const getPinnedMessages = useChatStore((state) => state.getPinnedMessages);

  useEffect(() => {
    if (isMessageSearchOpen && messageSearchConversationId === activeConversation?.id) {
      searchInputRef.current?.focus();
    }
  }, [activeConversation?.id, isMessageSearchOpen, messageSearchConversationId]);

  const isSearchVisible =
    isMessageSearchOpen && messageSearchConversationId === activeConversation?.id;

  useEffect(() => {
    if (!isSearchVisible || !activeConversation?.id) return undefined;
    const timeoutId = window.setTimeout(() => {
      searchMessages(activeConversation.id, messageSearchInput);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [activeConversation?.id, isSearchVisible, messageSearchInput, searchMessages]);

  const closeMessageSearch = () => {
    setIsMessageSearchOpen(false);
    setMessageSearchInput("");
    setMessageSearchConversationId(null);
    clearMessageSearch();
  };

  const selectedUser =
    selectedUserFromStore ||
    (activeConversation ? { _id: activeConversation.id, id: activeConversation.id } : null);

  const isFriend = Boolean(
    selectedUser &&
      friends.some(
        (f) => (f._id || f.id) === (selectedUser._id || selectedUser.id)
      )
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleBlock = async () => {
    const userId = selectedUser?._id || selectedUser?.id;
    if (!userId) return;
    setIsMenuOpen(false);
    await blockUser(userId);
    useChatStore.getState().setSelectedUser(null);
    useChatStore.getState().setActiveConversationId(null);
  };

  const handleUnfriend = async () => {
    const userId = selectedUser?._id || selectedUser?.id;
    if (!userId) return;
    setIsMenuOpen(false);
    await removeFriend(userId);
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center gap-1 border-b border-border/70 bg-background/90 px-2 py-2 backdrop-blur-md sm:gap-2 sm:px-4">
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
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => activeConversation.isGroup && setIsGroupDetailsOpen(true)}>
          <AvatarWithOnlineIndicator isOnline={!activeConversation.isGroup && (activeConversation.peer.isOnline ?? false)}>
            <Avatar className="size-9 shrink-0 ring-1 ring-border/60">
              <Avatar.Image
                alt={activeConversation.peer.name}
                src={activeConversation.peer.avatarUrl}
              />
              <Avatar.Fallback className="text-sm font-medium">
                {activeConversation.peer.initials}
              </Avatar.Fallback>
            </Avatar>
          </AvatarWithOnlineIndicator>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {activeConversation.peer.name}
            </p>
            <p className="truncate text-xs text-muted">
              {activeConversation.isGroup ? `${selectedGroup?.members?.length || activeConversation.peer.memberCount || 0} members` : activeConversation.peer.isOnline ? (
                <span className="font-medium text-success">Online</span>
              ) : formatLastSeen(activeConversation.peer.lastSeen)}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex flex-1 items-center gap-2.5 sm:text-left">
          <AppLogo size={36} className="rounded-[9px]" />
          <div className="flex-1 text-center sm:text-left">
            <p className="truncate text-[13px] font-medium text-muted">Select a conversation</p>
          </div>
        </div>
      )}

      <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-0.5 sm:gap-1">
        <div className="relative hidden min-[640px]:block">
          <Button variant="ghost" size="sm" isIconOnly aria-label="Notification settings" onPress={() => setIsNotificationMenuOpen((open) => !open)}>
            {notificationSettings.enabled ? <BellIcon className="size-5" /> : <BellOffIcon className="size-5" />}
          </Button>
          {isNotificationMenuOpen ? (
            <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-border bg-background p-3 shadow-xl">
              <p className="mb-2 text-sm font-semibold">Notifications</p>
              <Button className="mb-2 w-full" size="sm" variant={notificationSettings.enabled ? "flat" : "primary"} onPress={async () => {
                if (notificationSettings.enabled) setNotificationSettings({ ...notificationSettings, enabled: false });
                else await enableNotifications();
              }}>
                {notificationSettings.enabled ? "Notifications on" : "Enable notifications"}
              </Button>
              <label className="flex items-center justify-between py-1 text-xs text-muted">Messages<input type="checkbox" checked={notificationSettings.messages} onChange={(event) => setNotificationSettings({ ...notificationSettings, messages: event.target.checked })} /></label>
              <label className="flex items-center justify-between py-1 text-xs text-muted">Friend requests<input type="checkbox" checked={notificationSettings.friendRequests} onChange={(event) => setNotificationSettings({ ...notificationSettings, friendRequests: event.target.checked })} /></label>
            </div>
          ) : null}
        </div>
        <div className="relative min-[640px]:hidden">
          <Button variant="ghost" size="sm" isIconOnly aria-label="More conversation settings" onPress={() => setIsUtilitiesOpen((open) => !open)}>
            <MoreHorizontalIcon className="size-5" aria-hidden />
          </Button>
          {isUtilitiesOpen ? <div className="absolute right-0 top-11 z-50 flex w-64 flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-xl">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Conversation settings</p>
            <Button className="w-full justify-start" size="sm" variant="flat" onPress={async () => { if (notificationSettings.enabled) setNotificationSettings({ ...notificationSettings, enabled: false }); else await enableNotifications(); }}><BellIcon className="size-4" /> {notificationSettings.enabled ? "Notifications on" : "Enable notifications"}</Button>
            <div className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-xs text-muted"><span>Appearance</span><ThemeToggle /></div>
            <div className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-xs text-muted"><span>Accent</span><ThemePresetPicker /></div>
            <div className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-xs text-muted"><span>Backdrop</span><WallpaperPicker /></div>
            <Button variant="flat" size="sm" className="w-full justify-start" onPress={() => setSoundEnabled(!isSoundEnabled)}>{isSoundEnabled ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />} Sound {isSoundEnabled ? "on" : "off"}</Button>
          </div> : null}
        </div>
        {activeConversation && !activeConversation.isGroup && (
          <div ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="shrink-0"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More options"
            >
              <MoreVertical className="size-5.5" strokeWidth={2} />
            </Button>

            {isMenuOpen && (
              <div className="absolute right-4 top-14 z-50 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1">
                {isFriend && (
                  <button
                    type="button"
                    onClick={handleUnfriend}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                  >
                    <UserMinus className="size-4" />
                    <span>Unfriend</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBlock}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                >
                  <Ban className="size-4" />
                  <span>Block User</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeConversation ? (
          <div className="relative">
            <Button variant="ghost" size="sm" isIconOnly aria-label="Pinned messages" onPress={() => { setIsPinnedOpen((open) => !open); if (!isPinnedOpen) getPinnedMessages(activeConversation.id); }}>
              <PinIcon className="size-5" aria-hidden />
            </Button>
            {isPinnedOpen ? <PinnedMessagesPanel onClose={() => setIsPinnedOpen(false)} /> : null}
          </div>
        ) : null}

        {activeConversation ? (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="shrink-0"
            aria-label="Search messages"
            onPress={() => {
              setMessageSearchInput("");
              setMessageSearchConversationId(activeConversation.id);
              setIsMessageSearchOpen(true);
            }}
          >
            <SearchIcon className="size-5" aria-hidden />
          </Button>
        ) : null}

        <div className="hidden min-[640px]:contents">
          <WallpaperPicker />
          <ThemePresetPicker />
        </div>

        <div className="hidden min-[640px]:contents"><ThemeToggle /></div>

        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          className="hidden shrink-0 min-[640px]:inline-flex"
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

      {isSearchVisible && activeConversation ? (
        <div className="absolute left-2 right-2 top-full z-40 border-b border-border bg-background p-2 shadow-lg sm:left-auto sm:right-2 sm:w-80">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2">
            <SearchIcon className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={searchInputRef}
              value={messageSearchInput}
              onChange={(event) => setMessageSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeMessageSearch();
              }}
              placeholder="Search messages..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
              aria-label="Search messages"
            />
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Close message search"
              onPress={closeMessageSearch}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          {messageSearchInput.trim() ? (
            <div className="mt-2 max-h-64 overflow-y-auto">
              {isSearchingMessages ? (
                <p className="px-2 py-3 text-xs text-muted">Searching...</p>
              ) : searchResults.length > 0 ? (
                <>
                  <p className="px-2 pb-1 text-xs text-muted">
                    {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                  </p>
                  {searchResults.map((result) => (
                    <button
                      key={result.messageId}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left hover:bg-accent-soft"
                      onClick={() => {
                        setSearchTargetMessageId(result.messageId);
                        setIsMessageSearchOpen(false);
                      }}
                    >
                      <span className="block truncate text-sm">{result.text}</span>
                      <span className="text-[11px] text-muted">
                        {formatMessageTime(result.createdAt)}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <p className="px-2 py-3 text-xs text-muted">No messages found.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {isGroupDetailsOpen && selectedGroup ? <GroupDetailsModal group={selectedGroup} onClose={() => setIsGroupDetailsOpen(false)} /> : null}
    </header>
  );
}