import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { UsersIcon, XIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useFriendStore } from "../../store/useFriendStore";

export function CreateGroupModal({ onClose }) {
  const friends = useFriendStore((state) => state.friends);
  const createGroup = useChatStore((state) => state.createGroup);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [image, setImage] = useState(null);
  const filteredFriends = useMemo(() => friends.filter((friend) => `${friend.fullName} ${friend.username || ""}`.toLowerCase().includes(query.toLowerCase())), [friends, query]);

  const toggleFriend = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append("name", name.trim());
    data.append("memberIds", JSON.stringify(selected));
    if (image) data.append("media", image);
    const group = await createGroup(data);
    if (group) onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="flex max-h-[min(680px,90vh)] w-full max-w-md flex-col rounded-2xl border border-border bg-background p-5 shadow-2xl" onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><UsersIcon className="size-5 text-accent" /> Create group</h2><Button type="button" variant="ghost" size="sm" isIconOnly aria-label="Close" onPress={onClose}><XIcon className="size-5" /></Button></div>
      <label className="text-xs text-muted">Group name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Weekend plans" /></label>
      <label className="mt-3 text-xs text-muted">Group photo<input className="mt-1 block w-full text-sm" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label>
      <label className="mt-3 text-xs text-muted">Find friends<input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Username or full name" /></label>
      <p className="mt-3 text-xs text-muted">{selected.length} member{selected.length === 1 ? "" : "s"} selected</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
        {filteredFriends.map((friend) => <label key={friend._id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-accent-soft"><input type="checkbox" checked={selected.includes(friend._id)} onChange={() => toggleFriend(friend._id)} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{friend.fullName}</span><span className="block truncate text-xs text-muted">@{friend.username || "user"}</span></span></label>)}
        {filteredFriends.length === 0 ? <p className="p-4 text-center text-sm text-muted">No connected friends found.</p> : null}
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onPress={onClose}>Cancel</Button><Button type="submit" variant="primary" isDisabled={!name.trim() || selected.length === 0}>Create</Button></div>
    </form>
  </div>;
}
