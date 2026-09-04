import { useWallpaper } from "../context/wallpaper";
import { useChatStore } from "../store/useChatStore";
import { useSelectedConversation } from "../hooks/useSelectedConversation";
import { useEffect } from "react";
import ChatSidebar from "../components/chat/ChatSidebar"
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";
import { ProfileModal } from "../components/profile/ProfileModal";

function ChatPage() {
  const { frameStyle } = useWallpaper();
  const openProfile = useChatStore((state) => state.openProfile);
  const profileUser = useChatStore((state) => state.profileUser);

  const getConversations = useChatStore((state) => state.getConversations);
  const getMessages = useChatStore((state) => state.getMessages);
  const getGroupMessages = useChatStore((state) => state.getGroupMessages);
  const getGroups = useChatStore((state) => state.getGroups);
  const getUsers = useChatStore((state) => state.getUsers);
  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);

  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();

  useEffect(() => {
    getUsers();
    getConversations();
    getGroups();
  }, [getConversations, getGroups, getUsers]);

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

          {activeConversation ? <ChatComposer/> : null}
        </div>
      </div>
      <ProfileModal key={profileUser?._id || "closed"} />
    </div>
  )
}

export default ChatPage