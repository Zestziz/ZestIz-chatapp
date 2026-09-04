import { PinIcon, XIcon } from "lucide-react";
import { Button } from "@heroui/react";
import { useChatStore } from "../../store/useChatStore";
import { formatMessageTime } from "../../lib/utils";

function preview(message) {
  if (message.deletedAt) return "Message deleted";
  if (message.poll) return `Poll: ${message.poll.question}`;
  if (message.text) return message.text;
  if (message.image) return "Photo";
  if (message.video) return "Video";
  if (message.audio) return "Voice message";
  return "Message";
}

export function PinnedMessagesPanel({ onClose }) {
  const pinnedMessages = useChatStore((state) => state.pinnedMessages);
  const setSearchTargetMessageId = useChatStore((state) => state.setSearchTargetMessageId);
  return <div className="absolute right-0 top-full z-40 w-[min(22rem,calc(100vw-1rem))] rounded-xl border border-border bg-background p-2 shadow-xl">
    <div className="flex items-center justify-between px-2 py-1"><p className="flex items-center gap-1.5 text-sm font-semibold"><PinIcon className="size-4 text-accent" /> Pinned messages</p><Button variant="ghost" size="sm" isIconOnly aria-label="Close pinned messages" onPress={onClose}><XIcon className="size-4" /></Button></div>
    <div className="mt-1 max-h-72 overflow-y-auto">{pinnedMessages.filter((message) => !message.deletedAt && message.isPinned !== false).map((message) => <button key={message._id} type="button" className="block w-full rounded-lg px-2 py-2 text-left hover:bg-accent-soft" onClick={() => { setSearchTargetMessageId(String(message._id)); onClose(); }}><span className="block truncate text-sm">{preview(message)}</span><span className="text-[11px] text-muted">{message.senderId?.fullName || "Member"} · {formatMessageTime(message.createdAt)}</span></button>)}{pinnedMessages.filter((message) => !message.deletedAt && message.isPinned !== false).length === 0 ? <p className="px-2 py-4 text-center text-xs text-muted">No pinned messages</p> : null}</div>
  </div>;
}
