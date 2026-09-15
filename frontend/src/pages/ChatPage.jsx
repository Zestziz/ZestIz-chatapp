import { useWallpaper } from "../context/wallpaper";
import { useChatStore } from "../store/useChatStore";
import { useFriendStore } from "../store/useFriendStore";
import { useSelectedConversation } from "../hooks/useSelectedConversation";
import { useMobileBackHandler } from "../hooks/useMobileBackHandler";
import { useEffect, useCallback, lazy, Suspense } from "react";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";

const ProfileModal = lazy(() =>
  import("../components/profile/ProfileModal").then((module) => ({
    default: module.ProfileModal,
  }))
);

function ChatPage() {
  const { frameStyle } = useWallpaper();
  const openProfile = useChatStore((state) => state.openProfile);
  const profileUser = useChatStore((state) => state.profileUser);
  const closeProfile = useChatStore((state) => state.closeProfile);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);

  const getConversations = useChatStore((state) => state.getConversations);
  const getMessages = useChatStore((state) => state.getMessages);
  const getGroupMessages = useChatStore((state) => state.getGroupMessages);
  const getGroups = useChatStore((state) => state.getGroups);
  const getUsers = useChatStore((state) => state.getUsers);
  const getFriends = useFriendStore((state) => state.getFriends);
  const getPendingRequests = useFriendStore((state) => state.getPendingRequests);
  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);

  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  // Profile modal: back button closes it (priority 1 = topmost layer).
  const handleProfileBack = useCallback(() => {
    closeProfile();
  }, [closeProfile]);
  useMobileBackHandler(!!profileUser, handleProfileBack, { priority: 1 });

  // Active chat on mobile: back button returns to sidebar (priority 0).
  const handleChatBack = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);
  const isMobileChatOpen = !isLargeScreen && !!activeConversationId;
  useMobileBackHandler(isMobileChatOpen, handleChatBack, { priority: 0 });

  useEffect(() => {
    Promise.allSettled([getUsers(), getConversations(), getGroups(), getFriends(), getPendingRequests()]);
  }, [getConversations, getGroups, getUsers, getFriends, getPendingRequests]);

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (!activeConversationId) return;

    if (activeConversationId.startsWith("group:")) getGroupMessages(activeConversationId.slice(6));
    else getMessages(activeConversationId);
  }, [getGroupMessages, getMessages, activeConversationId]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black/20 p-0 text-foreground sm:p-2 lg:p-4" style={frameStyle}>
      <div className="mx-auto flex h-full w-full min-h-0 flex-1 overflow-hidden bg-background/95 text-foreground sm:rounded-[22px] sm:border sm:border-white/10 sm:shadow-2xl">
        <ChatSidebar onOpenProfile={openProfile} />

        <div
          className={`flex-1 flex-col overflow-hidden ${
            !isLargeScreen && !activeConversationId ? "hidden lg:flex" : "flex min-w-0"
          }`}
        >
          <ChatHeader />
          <MessageList />

          {activeConversation ? <ChatComposer /> : null}
        </div>
      </div>
      <Suspense fallback={null}>
        <ProfileModal key={profileUser?._id || "closed"} />
      </Suspense>
    </div>
  );
}

export default ChatPage;
