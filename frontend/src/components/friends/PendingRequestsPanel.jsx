import { useEffect } from "react";
import { useFriendStore } from "../../store/useFriendStore";
import { Avatar, Button } from "@heroui/react";
import { Check, X } from "lucide-react";

export default function PendingRequestsPanel() {
  const incomingRequests = useFriendStore((state) => state.incomingRequests);
  const outgoingRequests = useFriendStore((state) => state.outgoingRequests);
  const getPendingRequests = useFriendStore((state) => state.getPendingRequests);
  const acceptRequest = useFriendStore((state) => state.acceptRequest);
  const rejectRequest = useFriendStore((state) => state.rejectRequest);
  const cancelRequest = useFriendStore((state) => state.cancelRequest);

  useEffect(() => {
    getPendingRequests();
  }, [getPendingRequests]);

  if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-b border-border">
      {incomingRequests.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold mb-2 text-foreground uppercase tracking-wider">Incoming Requests</h3>
          <ul className="space-y-3">
            {incomingRequests.map((req) => (
              <li key={req._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar src={req.sender.profilePic} name={req.sender.fullName} size="sm" />
                  <span className="text-sm font-medium truncate max-w-[100px]">{req.sender.fullName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button isIconOnly size="sm" color="success" variant="flat" onPress={() => acceptRequest(req.sender._id)}>
                    <Check className="size-4" />
                  </Button>
                  <Button isIconOnly size="sm" color="danger" variant="flat" onPress={() => rejectRequest(req.sender._id)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 text-foreground uppercase tracking-wider">Sent Requests</h3>
          <ul className="space-y-3">
            {outgoingRequests.map((req) => (
              <li key={req._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar src={req.receiver.profilePic} name={req.receiver.fullName} size="sm" />
                  <span className="text-sm font-medium truncate max-w-[100px]">{req.receiver.fullName}</span>
                </div>
                <Button size="sm" color="danger" variant="light" onPress={() => cancelRequest(req.receiver._id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
