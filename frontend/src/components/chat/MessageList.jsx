import { useEffect } from "react";
import useScrollToBottom from "../../hooks/useScrollToBottom";
import { MessageBubble } from "./MessageBubble";
import { NoConversationPlaceholder } from "./NoConversationPlaceholder";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";

function navigateToMessage(messagesScrollRef, messageId) {
  const messageElement = messagesScrollRef.current?.querySelector(
    `[data-message-id="${messageId}"]`,
  );
  if (!messageElement) return;

  messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
  messageElement.classList.add("ring-2", "ring-accent/60");
  window.setTimeout(() => messageElement.classList.remove("ring-2", "ring-accent/60"), 1200);
}

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation();
  const isTyping = useChatStore((state) => activeConversationId?.startsWith("group:")
    ? Object.values(state.typingUsers).some(Boolean)
    : activeConversationId ? !!state.typingUsers[activeConversationId] : false);
  const markMessagesRead = useChatStore((state) => state.markMessagesRead);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const searchTargetMessageId = useChatStore((state) => state.searchTargetMessageId);
  const setSearchTargetMessageId = useChatStore((state) => state.setSearchTargetMessageId);

  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const messagesScrollRef = useScrollToBottom(activeConversationId, lastMessageId);

  useEffect(() => {
    if (activeConversationId && lastMessageId) {
      markMessagesRead(activeConversationId);
    }
  }, [activeConversationId, lastMessageId, markMessagesRead]);

  useEffect(() => {
    if (!searchTargetMessageId) return;
    navigateToMessage(messagesScrollRef, searchTargetMessageId);
    setSearchTargetMessageId(null);
  }, [searchTargetMessageId, lastMessageId, messagesScrollRef, setSearchTargetMessageId]);

  useEffect(() => {
    if (isTyping && messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [isTyping, messagesScrollRef]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="zestiz-message-scroll flex min-w-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto bg-linear-to-b from-transparent via-background/10 to-transparent px-2 py-3 sm:px-5 sm:py-4"
        >
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
            Today
          </p>
          {activeConversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onReply={() => setReplyingTo(message)}
              onNavigateToReply={navigateToMessage}
            />
          ))}
          {isTyping && (
            <div className="flex w-full justify-start mt-1">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-muted">
                <div className="flex gap-1 items-center">
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></span>
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></span>
                  <span className="size-1.5 animate-bounce rounded-full bg-current"></span>
                </div>
                <span className="text-xs font-medium ml-1.5">
                  {activeConversation.peer.name} is typing...
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  );
}
