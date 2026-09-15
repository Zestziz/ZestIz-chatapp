import { useEffect, useState } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { Avatar } from "@heroui/react";
import { UserPlus, UserCheck, UserX, ChevronDown, ChevronRight, Send, ArrowUpRight } from "lucide-react";
import { getInitials } from "../../hooks/useSelectedConversation";

export default function PendingRequestsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const incomingRequests = useFriendStore((state) => state.incomingRequests);
  const outgoingRequests = useFriendStore((state) => state.outgoingRequests);
  const getPendingRequests = useFriendStore((state) => state.getPendingRequests);
  const acceptRequest = useFriendStore((state) => state.acceptRequest);
  const rejectRequest = useFriendStore((state) => state.rejectRequest);
  const cancelRequest = useFriendStore((state) => state.cancelRequest);

  useEffect(() => {
    getPendingRequests();
  }, [getPendingRequests]);

  const totalRequests = (incomingRequests?.length || 0) + (outgoingRequests?.length || 0);

  return (
    <div className="px-3 pb-2 pt-1 border-b border-border/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full py-2 px-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase cursor-pointer hover:text-zinc-200 transition select-none group focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
          <span>Pending Requests</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono leading-none">
            {totalRequests}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-transform" />
        )}
      </button>

      {isOpen && (
        <div className="pt-2 pb-1 space-y-3 transition-all">
          {totalRequests === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-2 italic bg-zinc-900/40 rounded-lg border border-zinc-800/50">
              No pending requests
            </p>
          ) : (
            <>
              {/* Incoming Requests */}
              {incomingRequests.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Incoming ({incomingRequests.length})</span>
                  </div>
                  <ul className="space-y-1.5">
                    {incomingRequests.map((req) => {
                      const sender = req.sender || {};
                      return (
                        <li
                          key={req._id}
                          className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="w-7 h-7 shrink-0">
                              <Avatar.Image
                                src={sender.profilePic || sender.avatar || sender.imageUrl || sender.avatarUrl}
                                alt={sender.fullName}
                              />
                              <Avatar.Fallback className="text-[10px] font-medium text-zinc-300">
                                {getInitials(sender.fullName || "User")}
                              </Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-200 truncate leading-tight">
                                {sender.fullName}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {sender.username ? `@${sender.username}` : sender.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => acceptRequest(sender._id)}
                              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all duration-150 active:scale-95 font-medium cursor-pointer"
                              title="Accept"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectRequest(sender._id)}
                              className="flex items-center justify-center p-1 rounded-full bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 transition-all duration-150 active:scale-95 cursor-pointer"
                              title="Decline"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Outgoing Requests */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Sent ({outgoingRequests.length})</span>
                  </div>
                  <ul className="space-y-1.5">
                    {outgoingRequests.map((req) => {
                      const receiver = req.receiver || {};
                      return (
                        <li
                          key={req._id}
                          className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="w-7 h-7 shrink-0">
                              <Avatar.Image
                                src={receiver.profilePic || receiver.avatar || receiver.imageUrl || receiver.avatarUrl}
                                alt={receiver.fullName}
                              />
                              <Avatar.Fallback className="text-[10px] font-medium text-zinc-300">
                                {getInitials(receiver.fullName || "User")}
                              </Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-200 truncate leading-tight">
                                {receiver.fullName}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {receiver.username ? `@${receiver.username}` : receiver.email}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => cancelRequest(receiver._id)}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-red-500/40 hover:text-red-400 transition-all duration-150 active:scale-95 shrink-0 font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
