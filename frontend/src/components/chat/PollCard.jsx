import { BarChart3Icon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

export function PollCard({ poll, isOwnMessage, onVote, onClose }) {
  const options = poll?.options || [];
  const totalVotes = options.reduce((total, option) => total + (option.votes?.length || 0), 0);
  const currentUserId = useAuthStore((state) => state.authUser?._id);
  const selectedIndex = options.findIndex((option) =>
    option.votes?.some((userId) => String(userId) === String(currentUserId))
  );

  return (
    <div className="w-full my-1 rounded-2xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-xl overflow-visible text-white">
      <p className="flex items-center gap-2 font-semibold text-white">
        <BarChart3Icon className="size-4 text-accent" />
        <span className="break-words flex-1">{poll?.question || "Poll"}</span>
      </p>
      <div className="space-y-2 mt-3">
        {options.map((option, index) => {
          const votes = option.votes?.length || 0;
          const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={index}
              type="button"
              disabled={poll?.isClosed}
              onClick={(e) => {
                e.stopPropagation();
                onVote(index);
              }}
              className={`relative block w-full overflow-hidden rounded-xl border p-2.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-accent bg-accent/20 font-medium text-white"
                  : "border-neutral-700/60 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200"
              } ${poll?.isClosed ? "cursor-default opacity-85" : "cursor-pointer"}`}
            >
              <span
                className="absolute inset-y-0 left-0 bg-accent/30 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
              <span className="relative z-10 flex items-center justify-between gap-3">
                <span className="break-words min-w-0 flex-1">{option.text}</span>
                <span className="shrink-0 tabular-nums text-xs font-semibold opacity-90">
                  {votes} ({percentage}%)
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-3">
        <span>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
          {poll?.isClosed ? " · Poll closed" : ""}
        </span>
        {isOwnMessage && !poll?.isClosed ? (
          <button
            type="button"
            className="font-medium text-accent hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Close Poll
          </button>
        ) : null}
      </div>
    </div>
  );
}
