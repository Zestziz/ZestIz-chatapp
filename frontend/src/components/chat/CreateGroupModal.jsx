import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { UsersIcon, XIcon, CameraIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useFriendStore } from "../../store/useFriendStore";
import { Avatar } from "@heroui/react";

export function CreateGroupModal({ onClose }) {
  const friends = useFriendStore((state) => state.friends);
  const createGroup = useChatStore((state) => state.createGroup);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const filteredFriends = useMemo(() =>
    friends.filter((friend) =>
      `${friend.fullName} ${friend.username || ""}`.toLowerCase().includes(query.toLowerCase())
    ),
    [friends, query]
  );

  const toggleFriend = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append("name", name.trim());
    data.append("memberIds", JSON.stringify(selected));
    if (image) data.append("media", image);
    const group = await createGroup(data);
    if (group) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md overflow-hidden"
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <UsersIcon className="size-5 text-accent" /> Create New Group
          </h2>
          <Button type="button" variant="ghost" size="sm" isIconOnly onPress={onClose} className="rounded-full text-zinc-400 hover:text-white">
            <XIcon className="size-5" />
          </Button>
        </header>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-6">
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <Avatar className="size-20 border-2 border-zinc-800" src={imagePreview} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="size-6 text-white" />
              </div>
              <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>

          <label className="block text-sm font-medium text-zinc-300">
            Group Name
            <div className="relative mt-1">
              <input
                required
                maxLength={30}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-accent text-white"
                placeholder="Enter group name..."
              />
              <span className="absolute right-3 top-2 text-xs text-zinc-500">{name.length}/30</span>
            </div>
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            Add Friends
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-accent text-white"
              placeholder="Search by name or username..."
            />
          </label>

          {selected.length > 0 && (
            <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-thin">
              {selected.map(id => {
                const friend = friends.find(f => f._id === id);
                return (
                  <div key={id} className="flex shrink-0 items-center justify-between gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-white">
                    {friend?.fullName.split(' ')[0]}
                    <XIcon className="size-3 cursor-pointer hover:text-red-400" onClick={() => toggleFriend(id)} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="min-h-40 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
            {filteredFriends.map((friend) => (
              <label key={friend._id} className="flex cursor-pointer items-center gap-3 border-b border-zinc-800 last:border-0 px-3 py-2 hover:bg-zinc-800/50">
                <input
                  type="checkbox"
                  checked={selected.includes(friend._id)}
                  onChange={() => toggleFriend(friend._id)}
                  className="accent-accent"
                />
                <Avatar className="size-8" src={friend.profilePic} />
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-white truncate">{friend.fullName}</span>
                  <span className="block text-xs text-zinc-500 truncate">@{friend.username || "user"}</span>
                </div>
              </label>
            ))}
            {filteredFriends.length === 0 && <p className="p-4 text-center text-sm text-zinc-500">No friends found.</p>}
          </div>
        </div>

        {/* Footer */}
        <footer className="shrink-0 flex items-center justify-between px-5 py-4 border-t border-zinc-800 bg-zinc-900">
          <p className="text-xs text-zinc-400">{selected.length} friend{selected.length === 1 ? "" : "s"} selected</p>
          <Button type="submit" variant="primary" className="bg-accent text-white font-bold px-6" isDisabled={!name.trim() || selected.length === 0}>
            Create Group
          </Button>
        </footer>
      </form>
    </div>
  );
}
