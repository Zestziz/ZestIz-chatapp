import { getInitials, useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { APP_NAME, AppLogo } from "../AppLogo";

import { SearchField, Tabs } from "@heroui/react";
import { MessageSquareIcon, UsersIcon, UserPlusIcon, UsersRoundIcon } from "lucide-react";
import { ConversationRow } from "./ConversationRow";
import { UserRow } from "./UserRow";
import FriendsSidebar from "../friends/FriendsSidebar";
import PendingRequestsPanel from "../friends/PendingRequestsPanel";
import PrivacySettingsTab from "../friends/PrivacySettingsTab";
import BlockedUsersPanel from "../friends/BlockedUsersPanel";
import { CreateGroupModal } from "./CreateGroupModal";

function mapUserForList(user, onlineUsers, lastSeenByUser) {
  return {
    conversationId: user._id,
    id: user._id,
    name: user.fullName,
    username: user.username,
    avatarUrl: user.profilePic,
    initials: getInitials(user.fullName),
    isOnline: onlineUsers.includes(user._id),
    lastSeen: lastSeenByUser[user._id] ?? user.lastSeen,
    unreadCount: user.unreadCount || 0,
    lastMessage: user.lastMessage,
    peer: {
      name: user.fullName,
      avatarUrl: user.profilePic,
      initials: getInitials(user.fullName),
      isOnline: onlineUsers.includes(user._id),
      lastSeen: lastSeenByUser[user._id] ?? user.lastSeen,
    },
  };
}

function ChatSidebar({ onOpenProfile }) {
  const conversations = useChatStore((state) => state.conversations);
  const groups = useChatStore((state) => state.groups);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const users = useChatStore((state) => state.users);

  const searchQuery = useChatStore((state) => state.searchQuery);
  const setSearchQuery = useChatStore((state) => state.setSearchQuery);

  const sidebarTab = useChatStore((state) => state.sidebarTab);
  const setSidebarTab = useChatStore((state) => state.setSidebarTab);

  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const lastSeenByUser = useAuthStore((state) => state.lastSeenByUser);
  const authUser = useAuthStore((state) => state.authUser);

  const { activeConversationId, isLargeScreen } = useSelectedConversation();

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const conversationUsers = conversations.map((user) => mapUserForList(user, onlineUsers, lastSeenByUser));
  const groupRows = groups.map((group) => ({
    conversationId: `group:${group._id}`,
    id: `group:${group._id}`,
    name: group.name,
    avatarUrl: group.profilePic,
    initials: getInitials(group.name),
    isGroup: true,
    unreadCount: group.unreadCount || 0,
    lastMessage: group.lastMessage,
    peer: { name: group.name, avatarUrl: group.profilePic, initials: getInitials(group.name), memberCount: group.members?.length || 0 },
  }));
  const allUsers = users.map((user) => mapUserForList(user, onlineUsers, lastSeenByUser));

  const allConversations = [...conversationUsers, ...groupRows].sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
  const filteredConversations = normalizedSearchQuery
    ? allConversations.filter((conversation) =>
      conversation.peer.name.toLowerCase().includes(normalizedSearchQuery) ||
      conversation.username?.toLowerCase().includes(normalizedSearchQuery),
      )
    : allConversations;

  const filteredUsers = normalizedSearchQuery
    ? allUsers.filter((user) =>
        user.name.toLowerCase().includes(normalizedSearchQuery) ||
        user.username?.toLowerCase().includes(normalizedSearchQuery),
      )
    : allUsers;

  return (
    <aside
      className={`w-full shrink-0 flex-col overflow-hidden bg-background/75 lg:w-82 lg:border-r lg:border-white/8 ${
        !isLargeScreen && activeConversationId ? "hidden lg:flex" : "flex"
      }`}
    >
      <div className="shrink-0 border-b border-border/70 px-3 pb-3 pt-3.5 sm:px-4">
        <div className="flex items-center gap-2.5">
          <AppLogo size={34} className="size-8.5 shrink-0 rounded-[10px]" alt="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold tracking-tight">{APP_NAME}</p>
            <p className="text-[11px] text-muted">Your conversations, in one place</p>
          </div>
          <button type="button" className="size-9 overflow-hidden rounded-full border border-border bg-surface ring-2 ring-transparent transition hover:ring-accent/30 focus-visible:ring-accent" aria-label="Open my profile" onClick={() => authUser?._id && onOpenProfile(authUser._id)}>
            <img src={authUser?.profilePic || "/logo.png"} alt="" className="size-full object-cover" />
          </button>
        </div>
      </div>

      <Tabs
        selectedKey={sidebarTab}
        onSelectionChange={(key) => setSidebarTab(String(key))}
        variant="secondary"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="shrink-0 border-b border-border/70 px-3 pb-3 pt-3 sm:px-4">
          <SearchField
            fullWidth
            variant="secondary"
            className="w-full"
            value={searchQuery}
            onChange={setSearchQuery}
          >
            <SearchField.Group className="rounded-xl bg-surface/80">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search" />
              {searchQuery ? <SearchField.ClearButton /> : null}
            </SearchField.Group>
          </SearchField>
        </div>

        <Tabs.ListContainer className="shrink-0 border-b border-border/70 px-3 py-2.5 sm:px-4">
          <Tabs.List className="w-full gap-1 rounded-xl bg-surface/70 p-1">
            <Tabs.Tab id="chats" className="flex-1 justify-center gap-1.5 rounded-[9px] text-xs data-[selected=true]:bg-background data-[selected=true]:shadow-sm">
              <MessageSquareIcon className="size-3.5 opacity-80" aria-hidden />
              Chats
            </Tabs.Tab>
            <Tabs.Tab id="users" className="flex-1 justify-center gap-1.5 rounded-[9px] text-xs data-[selected=true]:bg-background data-[selected=true]:shadow-sm">
              <UsersIcon className="size-3.5 opacity-80" aria-hidden />
              Users
            </Tabs.Tab>
            <Tabs.Tab id="friends" className="flex-1 justify-center gap-1.5 rounded-[9px] text-xs data-[selected=true]:bg-background data-[selected=true]:shadow-sm">
              <UserPlusIcon className="size-3.5 opacity-80" aria-hidden />
              Friends
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          id="chats"
          className="flex-1 overflow-x-hidden overflow-y-auto outline-none"
        >
          <button type="button" className="mx-3 my-2.5 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-[10px] border border-accent/20 bg-accent-soft/60 px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-accent-soft sm:mx-4 sm:w-[calc(100%-2rem)]" onClick={() => setIsCreateGroupOpen(true)}><UsersRoundIcon className="size-4" /> Create group</button>
          {filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No conversations match your search.
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                user={conversation}
                selected={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
                onProfile={() => onOpenProfile(conversation.id)}
              />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel id="users" className="flex-1 overflow-x-hidden overflow-y-auto outline-none">
          {filteredUsers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No people match your search.</p>
          ) : (
            filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={user.id === activeConversationId}
                onSelect={() => setActiveConversationId(user.id)}
                onProfile={() => onOpenProfile(user.id)}
              />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel id="friends" className="flex-1 overflow-x-hidden overflow-y-auto outline-none">
          <div className="flex flex-col h-full pt-1">
            <PrivacySettingsTab />
            <PendingRequestsPanel />
            <BlockedUsersPanel />
            <FriendsSidebar />
          </div>
        </Tabs.Panel>
      </Tabs>
      {isCreateGroupOpen ? <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} /> : null}
    </aside>
  );
}
export default ChatSidebar;