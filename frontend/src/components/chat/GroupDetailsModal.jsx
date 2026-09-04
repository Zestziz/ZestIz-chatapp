import { useEffect, useState } from "react";
import { Avatar, Button } from "@heroui/react";
import { CameraIcon, XIcon } from "lucide-react";
import { getInitials } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";

export function GroupDetailsModal({ group, onClose }) {
  const authUser = useAuthStore((state) => state.authUser);
  const updateGroup = useChatStore((state) => state.updateGroup);
  const updateGroupMembers = useChatStore((state) => state.updateGroupMembers);
  const updateGroupMemberRole = useChatStore((state) => state.updateGroupMemberRole);
  const friends = useFriendStore((state) => state.friends);
  const getFriends = useFriendStore((state) => state.getFriends);
  const [name, setName] = useState(group.name);
  const [image, setImage] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [transferTo, setTransferTo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = String(group.ownerId) === String(authUser?._id) || group.admins?.some((id) => String(id) === String(authUser?._id));
  const isOwner = String(group.ownerId) === String(authUser?._id);

  useEffect(() => {
    getFriends();
  }, [getFriends]);

  const handleSave = async () => {
    setIsSaving(true);
    const data = new FormData();
    data.append("name", name.trim());
    if (image) data.append("media", image);
    await updateGroup(group._id, data);
    setIsSaving(false);
  };
  const handleAdd = async (event) => { const userId = event.target.value; event.target.value = ""; if (userId) await updateGroupMembers(group._id, "add", userId); };
  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    await updateGroupMembers(group._id, "remove", pendingRemoval._id);
    setPendingRemoval(null);
  };
  const handleLeave = async () => {
    if (!isOwner) {
      await updateGroupMembers(group._id, "leave", authUser?._id);
      onClose();
      return;
    }
    if (group.members?.length < 2) return;
    if (!transferTo) return;
    await updateGroupMembers(group._id, "leave", authUser?._id, { transferTo });
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Group details</h2><Button variant="ghost" size="sm" isIconOnly aria-label="Close" onPress={onClose}><XIcon className="size-5" /></Button></div>
      <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-3"><Avatar className="size-16 ring-2 ring-accent/20"><Avatar.Image alt={group.name} src={group.profilePic} /><Avatar.Fallback>{getInitials(group.name)}</Avatar.Fallback></Avatar><div className="min-w-0"><p className="truncate font-semibold">{group.name}</p><p className="text-xs text-muted">{group.members?.length || 0} members</p></div></div>
      <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-border">{group.members?.map((member) => {
        const memberIsOwner = String(member._id) === String(group.ownerId);
        const memberIsAdmin = group.admins?.some((id) => String(id) === String(member._id));
        const canManage = !memberIsOwner && (isOwner || (isAdmin && !memberIsAdmin));
        return <div key={member._id} className="relative flex items-center justify-between border-b border-border px-3 py-2 last:border-0"><span className="min-w-0"><span className="block truncate text-sm">{member.fullName}</span><span className="block truncate text-xs text-muted">@{member.username || "user"}</span></span><span className="flex items-center gap-2 text-xs text-muted">{memberIsOwner ? "Owner" : memberIsAdmin ? "Admin" : "Member"}{canManage ? <button type="button" className="px-2 py-1 text-base" aria-label={`Manage ${member.fullName}`} onClick={() => setOpenMenuId(openMenuId === member._id ? null : member._id)}>⋮</button> : null}</span>{openMenuId === member._id ? <div className="absolute right-2 top-10 z-10 flex w-40 flex-col rounded-lg border border-border bg-background p-1 shadow-lg">{isOwner && !memberIsAdmin ? <button type="button" className="rounded px-2 py-1.5 text-left text-xs hover:bg-accent-soft" onClick={async () => { await updateGroupMemberRole(group._id, member._id, "admin"); setOpenMenuId(null); }}>Make Admin</button> : null}<button type="button" className="rounded px-2 py-1.5 text-left text-xs text-danger hover:bg-danger/10" onClick={() => { setPendingRemoval(member); setOpenMenuId(null); }}>Remove Member</button></div> : null}</div>;
      })}</div>
      {isAdmin ? <div className="mt-4 space-y-2"><label className="block text-xs text-muted">Group name<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><label className="flex cursor-pointer items-center gap-2 text-xs text-muted"><CameraIcon className="size-4" /> Change group photo<input className="sr-only" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label><select defaultValue="" onChange={handleAdd} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="">Add a connected friend...</option>{friends.filter((friend) => !group.members?.some((member) => String(member._id) === String(friend._id)) && String(friend._id) !== String(authUser?._id)).map((friend) => <option key={friend._id} value={friend._id}>{friend.fullName}</option>)}</select><Button className="w-full" variant="primary" isDisabled={isSaving} onPress={handleSave}>{isSaving ? "Saving..." : "Save group"}</Button></div> : null}
      {isOwner ? group.members?.length > 1 ? <div className="mt-4 space-y-2 border-t border-border pt-4"><p className="text-xs text-muted">Transfer ownership and leave</p><select value={transferTo} onChange={(event) => setTransferTo(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="">Select new owner...</option>{group.members.filter((member) => String(member._id) !== String(authUser?._id)).map((member) => <option key={member._id} value={member._id}>{member.fullName}</option>)}</select><Button className="w-full" variant="flat" isDisabled={!transferTo} onPress={handleLeave}>Transfer ownership & leave</Button></div> : <p className="mt-4 text-center text-xs text-muted">You are the only member. The group cannot be left without an owner.</p> : <Button className="mt-4 w-full" variant="flat" onPress={handleLeave}>Leave group</Button>}
      {pendingRemoval ? <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-xs rounded-xl border border-border bg-background p-4 shadow-xl"><p className="text-sm font-semibold">Remove {pendingRemoval.fullName} from this group?</p><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onPress={() => setPendingRemoval(null)}>Cancel</Button><Button variant="danger" onPress={confirmRemoval}>Remove</Button></div></div></div> : null}
    </section>
  </div>;
}
