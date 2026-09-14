import { useEffect } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { Avatar } from "@heroui/react";
import { ShieldAlert, UserCheck } from "lucide-react";
import { getInitials } from "../../hooks/useSelectedConversation";

export default function BlockedUsersPanel() {
  const blockedUsers = useFriendStore((state) => state.blockedUsers);
  const fetchBlockedUsers = useFriendStore((state) => state.fetchBlockedUsers);
  const unblockUser = useFriendStore((state) => state.unblockUser);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ShieldAlert className="size-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Blocked Users ({blockedUsers.length})
        </h2>
      </div>

      {blockedUsers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No blocked users
        </p>
      ) : (
        <ul className="space-y-3">
          {blockedUsers.map((user) => (
            <li
              key={user._id}
              className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={user.profilePic}
                  name={getInitials(user.fullName)}
                  size="sm"
                  className="size-8"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => unblockUser(user._id)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all duration-150 active:scale-95 shrink-0 font-medium"
              >
                <UserCheck className="size-3 text-emerald-400" />
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
