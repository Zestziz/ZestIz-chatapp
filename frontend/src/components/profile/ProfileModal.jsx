import { useEffect, useState } from "react";
import { Avatar, Button } from "@heroui/react";
import { useClerk } from "@clerk/react";
import { CameraIcon, LogOutIcon, MessageCircleIcon, UserPlusIcon, UserMinusIcon, BanIcon, UnlockIcon, XIcon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useFriendStore } from "../../store/useFriendStore";
import { getInitials } from "../../hooks/useSelectedConversation";

export function ProfileModal() {
  const { signOut } = useClerk();
  const profile = useChatStore((state) => state.profileUser);
  const closeProfile = useChatStore((state) => state.closeProfile);
  const updateProfile = useChatStore((state) => state.updateProfile);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const authUser = useAuthStore((state) => state.authUser);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const sendFriendRequest = useFriendStore((state) => state.sendFriendRequest);
  const removeFriend = useFriendStore((state) => state.removeFriend);
  const blockUser = useFriendStore((state) => state.blockUser);
  const unblockUser = useFriendStore((state) => state.unblockUser);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [profilePicObjectUrl, setProfilePicObjectUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isOwnProfile = Boolean(profile && String(profile._id) === String(authUser?._id));
  const isOnline = Boolean(profile && onlineUsers.includes(profile._id));

  useEffect(() => () => {
    if (profilePicObjectUrl) URL.revokeObjectURL(profilePicObjectUrl);
  }, [profilePicObjectUrl]);

  if (!profile) return null;

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const data = new FormData();
    data.append("fullName", fullName);
    data.append("username", username);
    data.append("bio", bio);
    if (profilePic) data.append("profilePic", profilePic);
    const didSave = await updateProfile(data);
    setIsSaving(false);
    if (didSave) {
      const updatedProfile = useChatStore.getState().profileUser;
      useFriendStore.setState((state) => ({
        friends: state.friends.map((user) => String(user._id) === String(updatedProfile._id) ? { ...user, ...updatedProfile } : user),
      }));
      setIsEditing(false);
    }
  };

  const handleMessage = () => {
    setActiveConversationId(profile._id);
    closeProfile();
  };

  const handleLogout = async () => {
    closeProfile();
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && closeProfile()}>
      <section className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-label="ZestIz profile">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">ZestIz profile</h2>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Close profile" onPress={closeProfile}>
            <XIcon className="size-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="size-24">
              <Avatar.Image alt={profile.fullName} src={profilePicUrl || profile.profilePic} />
              <Avatar.Fallback className="text-2xl font-medium">{getInitials(profile.fullName)}</Avatar.Fallback>
            </Avatar>
            {isOnline ? <span className="absolute bottom-1 right-1 size-4 rounded-full border-2 border-background bg-emerald-500" /> : null}
          </div>
          {!isEditing ? (
            <>
              <h3 className="mt-3 text-xl font-semibold">{profile.fullName}</h3>
              <p className="text-sm text-accent">@{profile.username || "user"}</p>
              <p className="mt-2 min-h-5 max-w-xs text-sm text-muted">{profile.bio}</p>
              <p className="mt-2 text-xs text-muted">
                {isOnline ? "Online" : profile.lastSeen ? `Last seen ${new Date(profile.lastSeen).toLocaleString()}` : "Last seen unavailable"}
              </p>
            </>
          ) : (
            <form className="mt-4 w-full space-y-3 text-left" onSubmit={handleSave}>
              <label className="block text-xs text-muted">Full name<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} required /></label>
              <label className="block text-xs text-muted">Username<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} required /></label>
              <label className="block text-xs text-muted">Bio<textarea className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} /></label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted"><CameraIcon className="size-4" /> Change picture<input className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] || null; if (profilePicObjectUrl) URL.revokeObjectURL(profilePicObjectUrl); setProfilePic(file); if (file) { const url = URL.createObjectURL(file); setProfilePicObjectUrl(url); setProfilePicUrl(url); } else { setProfilePicUrl(""); } }} /></label>
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onPress={() => setIsEditing(false)}>Cancel</Button><Button type="submit" variant="primary" isDisabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button></div>
            </form>
          )}
        </div>

        {!isOwnProfile && !isEditing ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {profile.isBlocked || profile.isBlockedBy ? (
              profile.isBlocked ? <Button variant="flat" onPress={() => unblockUser(profile._id)}><UnlockIcon className="size-4" /> Unblock</Button> : null
            ) : profile.isFriend ? (
              <><Button variant="primary" onPress={handleMessage}><MessageCircleIcon className="size-4" /> Message</Button><Button variant="flat" onPress={() => removeFriend(profile._id)}><UserMinusIcon className="size-4" /> Unfriend</Button></>
            ) : profile.hasPendingRequest ? (
              <Button variant="flat" isDisabled>Pending</Button>
            ) : (
              <Button variant="primary" onPress={() => sendFriendRequest(profile._id)}><UserPlusIcon className="size-4" /> Add friend</Button>
            )}
            {!profile.isBlockedBy ? <Button variant="flat" onPress={() => blockUser(profile._id)}><BanIcon className="size-4" /> Block</Button> : null}
          </div>
        ) : null}
        {isOwnProfile && !isEditing ? (
          <div className="mt-5 flex gap-2">
            <Button className="flex-1" variant="primary" onPress={() => setIsEditing(true)}>Edit profile</Button>
            <Button variant="flat" isIconOnly aria-label="Log out" onPress={handleLogout}><LogOutIcon className="size-4" /></Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
