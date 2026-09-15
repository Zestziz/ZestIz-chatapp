import { useEffect, useState } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { Avatar } from "@heroui/react";
import { ShieldAlert, UserCheck, ChevronDown, ChevronRight } from "lucide-react";
import { getInitials } from "../../hooks/useSelectedConversation";

export default function BlockedUsersPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const blockedUsers = useFriendStore((state) => state.blockedUsers);
  const fetchBlockedUsers = useFriendStore((state) => state.fetchBlockedUsers);
  const unblockUser = useFriendStore((state) => state.unblockUser);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  return (
    <div className="px-3 pb-2 pt-1 border-b border-border/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full py-2 px-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase cursor-pointer hover:text-zinc-200 transition select-none group focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
          <span>Blocked Users</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono leading-none">
            {blockedUsers.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-transform" />
        )}
      </button>

      {isOpen && (
        <div className="pt-2 pb-1 transition-all">
          {blockedUsers.length === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-2 italic bg-zinc-900/40 rounded-lg border border-zinc-800/50">
              No blocked users
            </p>
          ) : (
            <ul className="space-y-2">
              {blockedUsers.map((user) => (
                <li
                  key={user._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-7 h-7 shrink-0">
                      <Avatar.Image
                        src={user.profilePic || user.avatar || user.imageUrl || user.avatarUrl}
                        alt={user.fullName}
                      />
                      <Avatar.Fallback className="text-[10px] font-medium text-zinc-300">
                        {getInitials(user.fullName)}
                      </Avatar.Fallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate leading-tight">
                        {user.fullName}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {user.username ? `@${user.username}` : user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => unblockUser(user._id)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-150 active:scale-95 shrink-0 font-medium cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3" />
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
