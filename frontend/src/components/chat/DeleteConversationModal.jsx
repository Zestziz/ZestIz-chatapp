import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";
import { useBackHandler } from "../../hooks/useBackHandler";

export function DeleteConversationModal({
  isOpen,
  onClose,
  onConfirm,
  userName = "this chat",
  isGroup = false,
  isLoading = false,
}) {
  useBackHandler(isOpen && !isLoading, onClose, "modal-delete");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-conversation-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md text-foreground transition-all duration-200 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          {/* Danger Icon Badge */}
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
            <Trash2 className="size-6" />
          </div>

          <h3
            id="delete-conversation-title"
            className="text-lg font-bold text-white leading-6"
          >
            {isGroup ? "Clear Group Chat" : "Delete Conversation"}
          </h3>

          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            {isGroup ? (
              <>
                Are you sure you want to clear the message history for{" "}
                <span className="font-semibold text-zinc-200">{userName}</span>?
                This will clear messages on your device without removing you from the group.
              </>
            ) : (
              <>
                Are you sure you want to delete your conversation with{" "}
                <span className="font-semibold text-zinc-200">{userName}</span>?
                This will clear your chat history with this user. This action cannot be undone.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="flat"
            size="md"
            isDisabled={isLoading}
            onPress={onClose}
            className="w-full sm:w-auto bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="solid"
            color="danger"
            size="md"
            isDisabled={isLoading}
            onPress={onConfirm}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {isGroup ? "Clearing..." : "Deleting..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="size-4" />
                {isGroup ? "Clear Chat History" : "Delete Conversation"}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
