import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Avatar, Button } from "@heroui/react";
import {
  CameraIcon,
  XIcon,
  CrownIcon,
  ShieldIcon,
  MoreVerticalIcon,
  UserPlusIcon,
  LogOutIcon,
  Trash2Icon,
  ArrowRightLeftIcon,
  ShieldAlertIcon,
  SearchIcon,
  CheckIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  ShieldXIcon,
} from "lucide-react";
import { getInitials } from "../../hooks/useSelectedConversation";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import toast from "react-hot-toast";
import { useBackHandler } from "../../hooks/useBackHandler";

export function GroupDetailsModal({ group, onClose }) {
  useBackHandler(true, onClose, "group-details");
  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const updateGroup = useChatStore((state) => state.updateGroup);
  const updateGroupMembers = useChatStore((state) => state.updateGroupMembers);
  const updateGroupMemberRole = useChatStore((state) => state.updateGroupMemberRole);
  const transferOwnership = useChatStore((state) => state.transferOwnership);

  const friends = useFriendStore((state) => state.friends);
  const getFriends = useFriendStore((state) => state.getFriends);

  // Group Details Form State
  const [name, setName] = useState(group?.name || "");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Member search & dropdown state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState(null); // { member, position: { top, right } }

  // Sub-modal states
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedFriendToAdd, setSelectedFriendToAdd] = useState("");

  const isOwner = String(group?.ownerId) === String(authUser?._id);
  const isAdmin = isOwner || group?.admins?.some((id) => String(id) === String(authUser?._id));

  const actionButtonRefs = useRef({});

  useEffect(() => {
    getFriends();
  }, [getFriends]);

  // Close dropdown menu on scroll or resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeMenu) setActiveMenu(null);
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeMenu]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveDetails = async () => {
    if (!name.trim()) return toast.error("Group name cannot be empty");
    setIsSaving(true);
    const data = new FormData();
    data.append("name", name.trim());
    if (image) data.append("media", image);
    const success = await updateGroup(group._id, data);
    setIsSaving(false);
    if (success) toast.success("Group updated successfully");
  };

  const handleAddMember = async () => {
    if (!selectedFriendToAdd) return;
    const success = await updateGroupMembers(group._id, "add", selectedFriendToAdd);
    if (success) {
      toast.success("Member added");
      setSelectedFriendToAdd("");
      setIsAddMemberOpen(false);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!pendingRemoval) return;
    const success = await updateGroupMembers(group._id, "remove", pendingRemoval._id);
    if (success) toast.success(`Removed ${pendingRemoval.fullName}`);
    setPendingRemoval(null);
  };

  const handleToggleAdminRole = async (member, isAlreadyAdmin) => {
    const newRole = isAlreadyAdmin ? "member" : "admin";
    const success = await updateGroupMemberRole(group._id, member._id, newRole);
    if (success) {
      toast.success(isAlreadyAdmin ? `Demoted ${member.fullName} to Member` : `Promoted ${member.fullName} to Admin`);
    }
    setActiveMenu(null);
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    const success = await transferOwnership(group._id, selectedNewOwner);
    if (success) {
      toast.success("Ownership transferred successfully");
      setIsTransferModalOpen(false);
      setSelectedNewOwner("");
    }
  };

  const handleLeaveGroup = async () => {
    if (isOwner && group.members?.length > 1) {
      setIsLeaveConfirmOpen(false);
      setIsTransferModalOpen(true);
      toast.error("Please transfer ownership before leaving the group.");
      return;
    }

    const success = await updateGroupMembers(group._id, "leave", authUser?._id);
    if (success) {
      toast.success(group.members?.length <= 1 ? "Group deleted" : "Left group");
      onClose();
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return group.members || [];
    const q = searchQuery.toLowerCase();
    return (group.members || []).filter(
      (m) => m.fullName?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
    );
  }, [group.members, searchQuery]);

  // Online count in group
  const onlineCount = useMemo(() => {
    return (group.members || []).filter((m) => onlineUsers?.includes(m._id)).length;
  }, [group.members, onlineUsers]);

  // Connected friends eligible to be added
  const availableFriends = useMemo(() => {
    return friends.filter(
      (friend) =>
        !group.members?.some((member) => String(member._id) === String(friend._id)) &&
        String(friend._id) !== String(authUser?._id)
    );
  }, [friends, group.members, authUser?._id]);

  const toggleMenu = (member, event) => {
    event.stopPropagation();
    if (activeMenu?.member?._id === member._id) {
      setActiveMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveMenu({
      member,
      position: {
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      },
    });
  };

  if (!group || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal Shell */}
      <section
        className="flex flex-col w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-zinc-950/95 sm:border sm:border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden pb-safe text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* TIER 1: Fixed Header */}
        <header className="shrink-0 p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/80 space-y-4">
          {/* Top Row: Title & Close Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Group Info</h2>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 size-8"
              aria-label="Close"
              onPress={onClose}
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {/* Group Avatar & Name Card */}
          <div className="flex items-center gap-3.5 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
            <div className="relative shrink-0 group">
              <Avatar className="size-14 ring-2 ring-zinc-700 shadow-md">
                <Avatar.Image alt={group.name} src={imagePreview || group.profilePic} />
                <Avatar.Fallback className="text-base font-bold bg-zinc-800 text-white">
                  {getInitials(group.name)}
                </Avatar.Fallback>
              </Avatar>
              {isAdmin && (
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraIcon className="size-5 text-white" />
                  <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Group name"
                    className="w-full font-bold text-sm bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                  {(name !== group.name || image) && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="shrink-0 font-semibold text-xs bg-cyan-500 hover:bg-cyan-600 text-black px-2.5 h-7"
                      isDisabled={isSaving}
                      onPress={handleSaveDetails}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
              ) : (
                <h3 className="font-bold text-sm text-white truncate">{group.name}</h3>
              )}
              <p className="text-xs text-zinc-400">
                {group.members?.length || 0} members · <span className="text-emerald-400 font-medium">{onlineCount} online</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Admin only) */}
          {isAdmin && (
            <Button
              variant="flat"
              className="w-full justify-center gap-2 text-xs font-semibold h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20"
              onPress={() => setIsAddMemberOpen((prev) => !prev)}
            >
              <UserPlusIcon className="size-3.5" />
              {isAddMemberOpen ? "Hide Add Member" : "Add Member"}
            </Button>
          )}

          {/* Expandable Add Member Drawer */}
          {isAddMemberOpen && (
            <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/90 p-3 space-y-2 animate-in fade-in duration-150">
              <p className="text-xs font-semibold text-cyan-400">Select a connected friend:</p>
              <div className="flex gap-2">
                <select
                  value={selectedFriendToAdd}
                  onChange={(e) => setSelectedFriendToAdd(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Choose a friend...</option>
                  {availableFriends.map((friend) => (
                    <option key={friend._id} value={friend._id}>
                      {friend.fullName} (@{friend.username || "user"})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-600 px-3 h-8"
                  isDisabled={!selectedFriendToAdd}
                  onPress={handleAddMember}
                >
                  Add
                </Button>
              </div>
              {availableFriends.length === 0 && (
                <p className="text-[11px] text-zinc-500">No additional connected friends available to add.</p>
              )}
            </div>
          )}

          {/* Search Members Bar */}
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 size-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-zinc-400 hover:text-white"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* TIER 2: Scrollable Content Body (The ONLY scrolling container) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
            <span>MEMBERS ({filteredMembers.length})</span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 divide-y divide-zinc-800/50 overflow-hidden">
            {filteredMembers.map((member) => {
              const memberIsOwner = String(member._id) === String(group.ownerId);
              const memberIsAdmin = group.admins?.some((id) => String(id) === String(member._id));
              const isSelf = String(member._id) === String(authUser?._id);
              const isOnline = onlineUsers?.includes(member._id);

              // Permission logic:
              // - Owner is untouchable (no action menu for anyone on Owner row)
              // - Admins/Owner can manage regular members and peer admins (demote/kick)
              // - Regular members have zero actions
              const canManage = !memberIsOwner && !isSelf && (isOwner || isAdmin);

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-zinc-800/40 transition gap-2"
                >
                  {/* User Profile View */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="size-9 ring-1 ring-zinc-700">
                        <Avatar.Image alt={member.fullName} src={member.profilePic} />
                        <Avatar.Fallback className="text-xs font-semibold bg-zinc-800 text-white">
                          {getInitials(member.fullName)}
                        </Avatar.Fallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs sm:text-sm font-semibold text-white">
                          {member.fullName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">
                            You
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[11px] text-zinc-400">
                        @{member.username || "user"}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Menu Trigger */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Role Badge */}
                    {memberIsOwner ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <CrownIcon className="size-3 text-amber-400" />
                        Owner
                      </span>
                    ) : memberIsAdmin ? (
                      <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                        <ShieldIcon className="size-3 text-cyan-400" />
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50">
                        Member
                      </span>
                    )}

                    {/* Contextual Action Button */}
                    {canManage && (
                      <button
                        ref={(el) => (actionButtonRefs.current[member._id] = el)}
                        type="button"
                        className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        onClick={(e) => toggleMenu(member, e)}
                        aria-label={`Manage ${member.fullName}`}
                      >
                        <MoreVerticalIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <p className="p-4 text-center text-xs text-zinc-500">No members match "{searchQuery}"</p>
            )}
          </div>
        </div>

        {/* TIER 3: Fixed Footer */}
        <footer className="shrink-0 p-4 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2.5">
          {/* Transfer Ownership Card (Owner Only) */}
          {isOwner && group.members?.length > 1 && (
            <Button
              size="sm"
              variant="flat"
              className="w-full text-xs font-semibold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 h-8 rounded-lg"
              onPress={() => setIsTransferModalOpen(true)}
            >
              <ArrowRightLeftIcon className="size-3.5 mr-1.5" />
              Transfer Ownership
            </Button>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 font-semibold text-xs border border-zinc-800 hover:bg-zinc-800 text-zinc-300 h-9 rounded-lg"
              onPress={onClose}
            >
              Close
            </Button>

            <Button
              variant="danger"
              size="sm"
              className="flex-1 font-semibold text-xs bg-red-600 hover:bg-red-700 text-white h-9 rounded-lg"
              onPress={() => setIsLeaveConfirmOpen(true)}
            >
              <LogOutIcon className="size-3.5 mr-1.5" />
              {isOwner && group.members?.length <= 1 ? "Delete Group" : "Leave Group"}
            </Button>
          </div>
        </footer>

        {/* Portal-Rendered Dropdown Menu (Prevents overflow clipping) */}
        {activeMenu &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setActiveMenu(null)}
              />
              <div
                style={{
                  position: "fixed",
                  top: `${activeMenu.position.top}px`,
                  right: `${activeMenu.position.right}px`,
                }}
                className="z-[9999] w-48 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-zinc-200"
              >
                {(() => {
                  const targetIsAdmin = group.admins?.some((id) => String(id) === String(activeMenu.member._id));
                  return (
                    <>
                      {/* Toggle Admin */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition text-zinc-200"
                        onClick={() => handleToggleAdminRole(activeMenu.member, targetIsAdmin)}
                      >
                        {targetIsAdmin ? (
                          <>
                            <ShieldXIcon className="size-3.5 text-amber-400" />
                            Dismiss as Admin
                          </>
                        ) : (
                          <>
                            <ShieldCheckIcon className="size-3.5 text-cyan-400" />
                            Make Admin
                          </>
                        )}
                      </button>

                      {/* Remove Member */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
                        onClick={() => {
                          setPendingRemoval(activeMenu.member);
                          setActiveMenu(null);
                        }}
                      >
                        <UserMinusIcon className="size-3.5 text-red-400" />
                        Remove Member
                      </button>
                    </>
                  );
                })()}
              </div>
            </>,
            document.body
          )}

        {/* Sub-Modal: Confirm Removal */}
        {pendingRemoval &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
              <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <ShieldAlertIcon className="size-5" />
                  Remove Member
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">{pendingRemoval.fullName}</strong> from this group?
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="text-zinc-300 text-xs h-8" onPress={() => setPendingRemoval(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="danger" className="bg-red-600 hover:bg-red-700 text-white text-xs h-8" onPress={handleConfirmRemoval}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Sub-Modal: Transfer Ownership */}
        {isTransferModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-zinc-950 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <CrownIcon className="size-5" />
                  Transfer Group Ownership
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Choose an eligible group member to become the new sovereign Owner. You will step down to an Admin.
                </p>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
                  {group.members
                    ?.filter((m) => String(m._id) !== String(authUser?._id))
                    .map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        className={`flex w-full items-center justify-between p-2.5 text-left text-xs transition ${
                          selectedNewOwner === member._id ? "bg-cyan-500/15 text-cyan-300 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                        }`}
                        onClick={() => setSelectedNewOwner(member._id)}
                      >
                        <span className="truncate">{member.fullName}</span>
                        {selectedNewOwner === member._id && <CheckIcon className="size-4 text-cyan-400" />}
                      </button>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" className="text-zinc-300 text-xs h-8" onPress={() => setIsTransferModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-8"
                    isDisabled={!selectedNewOwner}
                    onPress={handleTransferOwnership}
                  >
                    Confirm Transfer
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Sub-Modal: Leave / Delete Group Confirmation */}
        {isLeaveConfirmOpen &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
              <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  {isOwner && group.members?.length <= 1 ? (
                    <>
                      <Trash2Icon className="size-4" />
                      Delete Group Permanently
                    </>
                  ) : (
                    <>
                      <LogOutIcon className="size-4" />
                      Leave Group
                    </>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {isOwner && group.members?.length <= 1
                    ? "You are the last member. Leaving will permanently delete the group and all its messages."
                    : isOwner
                    ? "As the owner, you must assign a new owner before you leave."
                    : "Are you sure you want to leave this group conversation?"}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="text-zinc-300 text-xs h-8" onPress={() => setIsLeaveConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="danger" className="bg-red-600 hover:bg-red-700 text-white text-xs h-8" onPress={handleLeaveGroup}>
                    {isOwner && group.members?.length <= 1 ? "Delete" : "Leave"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </section>
    </div>,
    document.body
  );
}
