import { useFriendStore } from "../../store/useFriendStore";
import { Globe, ShieldCheck } from "lucide-react";

export default function PrivacySettingsTab() {
  const messagePermission = useFriendStore((state) => state.messagePermission);
  const updatePrivacy = useFriendStore((state) => state.updatePrivacy);

  return (
    <div className="border-b border-border/70 bg-surface/40 px-4 py-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Message Privacy</h2>
        <p className="mt-0.5 text-xs text-muted">
          Who can send you direct messages?
        </p>
      </div>

      <div className="flex rounded-xl border border-border bg-background/60 p-1">
        <button
          onClick={() => updatePrivacy("everyone")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ease-in-out active:scale-95 ${
            messagePermission === "everyone"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-muted hover:bg-surface"
          }`}
        >
          <Globe className="size-4" /> Everyone
        </button>
        <button
          onClick={() => updatePrivacy("friends_only")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ease-in-out active:scale-95 ${
            messagePermission === "friends_only"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-muted hover:bg-surface"
          }`}
        >
          <ShieldCheck className="size-4" /> Friends Only
        </button>
      </div>
    </div>
  );
}
