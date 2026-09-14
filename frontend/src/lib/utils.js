export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export function formatLastSeen(date) {
  if (!date) return "Last seen unavailable";

  const elapsedMs = Math.max(0, Date.now() - new Date(date).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedMinutes < 1) return "Last seen just now";
  if (elapsedMinutes < 60) return `Last seen ${elapsedMinutes}m ago`;
  if (elapsedHours < 24) return `Last seen ${elapsedHours}h ago`;
  if (elapsedHours < 48) return "Last seen yesterday";

  return `Last seen ${new Date(date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
}