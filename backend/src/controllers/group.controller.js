import mongoose from "mongoose";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";

const groupSelect = "_id name profilePic ownerId admins members createdAt updatedAt";
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function isMember(group, userId) { return group.members.some((id) => id.toString() === userId.toString()); }
function isAdmin(group, userId) { return group.ownerId.toString() === userId.toString() || group.admins.some((id) => id.toString() === userId.toString()); }

async function eligibleMembers(user, ids) {
  const uniqueIds = [...new Set(ids.map(id => id.toString()))];
  if (uniqueIds.length !== ids.length || uniqueIds.some((id) => id === user._id.toString())) return null;
  const blocked = new Set((user.blockedUsers || []).map(id => id.toString()));
  const people = await User.find({ _id: { $in: uniqueIds } }).select("_id blockedUsers");
  if (people.length !== uniqueIds.length) return null;
  if (people.some((person) => blocked.has(person._id.toString()) || person.blockedUsers.some((id) => id.toString() === user._id.toString()))) return null;
  if (uniqueIds.some((id) => !(user.friends || []).some((friendId) => friendId.toString() === id))) return null;
  return people;
}

async function emitGroupUpdate(group) {
  const payload = await Group.findById(group._id).select(groupSelect).populate("members", "_id fullName username profilePic").lean();
  payload.groupId = String(payload._id);
  for (const member of payload.members) {
    const sockets = getReceiverSocketId(member._id);
    if (sockets) io.to(sockets).emit("groupUpdated", payload);
  }
  return payload;
}

export async function getGroups(req, res) {
  const groups = await Group.find({ members: req.user._id }).select(groupSelect).populate("members", "_id fullName username profilePic").lean();
  const latest = await Message.aggregate([{ $match: { groupId: { $in: groups.map((group) => group._id) } } }, { $sort: { createdAt: -1 } }, { $group: { _id: "$groupId", lastMessage: { $first: "$$ROOT" } } }]);
  const latestByGroup = new Map(latest.map((item) => [String(item._id), item.lastMessage]));
  res.json(groups.map((group) => ({ ...group, lastMessage: latestByGroup.get(String(group._id)) || null, unreadCount: 0 })));
}

export async function createGroup(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  let memberIds = req.body.memberIds;
  if (typeof memberIds === "string") { try { memberIds = JSON.parse(memberIds); } catch { memberIds = []; } }
  if (!name || name.length > 80) return res.status(400).json({ message: "Group name must be between 1 and 80 characters" });
  if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.some((id) => !validId(id))) return res.status(400).json({ message: "Select at least one connected friend" });
  const members = await eligibleMembers(req.user, memberIds);
  if (!members) return res.status(403).json({ message: "Every member must be a connected, eligible friend" });
  let profilePic = "";
  if (req.file) {
    if (!req.file.mimetype.startsWith("image/") || !hasImageKitConfig()) return res.status(400).json({ message: "A valid group image upload is required" });
    profilePic = await uploadChatMedia(req.file);
  }
  const group = await Group.create({ name, profilePic, ownerId: req.user._id, admins: [req.user._id], members: [req.user._id, ...members.map((member) => member._id)] });
  res.status(201).json(await emitGroupUpdate(group));
}

export async function getGroupMessages(req, res) {
  const { groupId } = req.params;
  if (!validId(groupId)) return res.status(400).json({ message: "Invalid group ID" });
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!isMember(group, req.user._id)) return res.status(403).json({ message: "You are not a group member" });
  res.json(await Message.find({ groupId }).populate({ path: "replyTo", select: "_id text image video audio poll senderId createdAt deletedAt" }).sort({ createdAt: 1 }));
}

export async function sendGroupMessage(req, res) {
  const { groupId } = req.params;
  const group = validId(groupId) && await Group.findById(groupId).populate("members", "_id username fullName");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!isMember(group, req.user._id)) return res.status(403).json({ message: "You are not a group member" });
  const { text, replyTo } = req.body;
  let reply = null;
  if (replyTo) { reply = await Message.findOne({ _id: replyTo, groupId }).select("_id groupId"); if (!reply) return res.status(400).json({ message: "Original message is outside this group" }); }

  const mentions = [];
  if (text) {
    if (/@everyone\b/i.test(text)) {
      mentions.push(...group.members.filter(m => m._id.toString() !== req.user._id.toString()).map(m => m._id.toString()));
    } else {
      const tagRegex = /@\[([^\]]+)\]\(([a-fA-F0-9]{24})\)/g;
      let match;
      while ((match = tagRegex.exec(text)) !== null) {
        const id = match[2];
        if (group.members.some(m => m._id.toString() === id.toString()) && id.toString() !== req.user._id.toString()) {
          mentions.push(id.toString());
        }
      }
      const plainRegex = /@([a-zA-Z0-9_.-]+)/g;
      while ((match = plainRegex.exec(text)) !== null) {
        const handle = match[1].toLowerCase();
        const found = group.members.find(m => m.username && m.username.toLowerCase() === handle);
        if (found && found._id.toString() !== req.user._id.toString()) mentions.push(found._id.toString());
      }
    }
  }
  const uniqueMentions = [...new Set(mentions)];

  let image; let video; let audio;
  if (req.file) {
    if (!hasImageKitConfig()) return res.status(500).json({ message: "Media upload is not configured" });
    const url = await uploadChatMedia(req.file);
    if (req.file.mimetype.startsWith("video/")) video = url;
    else if (req.file.mimetype.startsWith("audio/")) audio = { url, duration: Number(req.body.audioDuration) };
    else image = url;
  }
  const message = await Message.create({ senderId: req.user._id, groupId, replyTo: reply?._id || null, text, image, video, audio, mentions: uniqueMentions, deliveredAt: new Date() });
  await message.populate({ path: "replyTo", select: "_id text image video audio poll senderId createdAt deletedAt" });
  try {
    for (const memberId of group.members) {
      if (String(memberId._id) === String(req.user._id)) continue;
      const sockets = getReceiverSocketId(memberId._id) || [];
      for (const socketId of sockets) {
        io.to(socketId).emit("newGroupMessage", message);
      }
      // Emitting mention events
      if (uniqueMentions.includes(String(memberId._id))) {
        for (const socketId of sockets) {
          io.to(socketId).emit("userMentioned", {
            messageId: String(message._id),
            groupId: String(groupId),
            senderId: String(req.user._id),
            text: message.text,
            createdAt: message.createdAt
          });
        }
      }
    }
  } catch (error) {
    console.error("Error broadcasting group message:", error.stack || error.message);
  }
  res.status(201).json(message);
}

export async function searchGroupMessages(req, res) {
  const { groupId } = req.params; const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const group = validId(groupId) && await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!isMember(group, req.user._id)) return res.status(403).json({ message: "You are not a group member" });
  if (!query) return res.json([]);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const messages = await Message.find({ groupId, text: { $regex: escaped, $options: "i" }, deletedAt: null }).select("_id text senderId createdAt").sort({ createdAt: -1 }).limit(50).lean();
  res.json(messages.map((message) => ({ messageId: String(message._id), text: message.text, senderId: String(message.senderId), createdAt: message.createdAt })));
}

export async function updateGroup(req, res) {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!isAdmin(group, req.user._id)) return res.status(403).json({ message: "Only group admins can update the group" });
  const name = typeof req.body.name === "string" ? req.body.name.trim() : group.name;
  if (!name || name.length > 80) return res.status(400).json({ message: "Group name must be between 1 and 80 characters" });
  group.name = name;
  if (req.file) { if (!req.file.mimetype.startsWith("image/") || !hasImageKitConfig()) return res.status(400).json({ message: "A valid group image upload is required" }); group.profilePic = await uploadChatMedia(req.file); }
  await group.save();
  res.json(await emitGroupUpdate(group));
}

export async function updateGroupMembers(req, res) {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  const { action, userId } = req.body;
  if (action === "leave") {
    if (!isMember(group, req.user._id)) return res.status(400).json({ message: "You are not a member" });
    if (String(group.ownerId) === String(req.user._id)) {
      const { transferTo } = req.body;
      if (!validId(transferTo) || String(transferTo) === String(req.user._id) || !isMember(group, transferTo)) {
        return res.status(400).json({ message: "Transfer ownership to another group member before leaving" });
      }
      group.ownerId = transferTo;
      if (!group.admins.some((id) => String(id) === String(transferTo))) group.admins.push(transferTo);
      group.members = group.members.filter((id) => String(id) !== String(req.user._id));
      group.admins = group.admins.filter((id) => String(id) !== String(req.user._id));
      await group.save();
      const oldOwnerSockets = getReceiverSocketId(req.user._id);
      if (oldOwnerSockets) for (const socketId of oldOwnerSockets) io.to(socketId).emit("groupRemoved", { groupId: String(group._id) });
      return res.json(await emitGroupUpdate(group));
    }
    group.members = group.members.filter((id) => String(id) !== String(req.user._id)); group.admins = group.admins.filter((id) => String(id) !== String(req.user._id));
  } else {
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ message: "Only group admins can manage members" });
    if (!validId(userId)) return res.status(400).json({ message: "Invalid user ID" });
    if (action === "add") { if (isMember(group, userId)) return res.status(400).json({ message: "User is already a member" }); const eligible = await eligibleMembers(req.user, [userId]); if (!eligible) return res.status(403).json({ message: "User is not an eligible connected friend" }); group.members.push(userId); }
    else if (action === "remove") { if (String(group.ownerId) === String(userId)) return res.status(400).json({ message: "The owner cannot be removed" }); if (!isMember(group, userId)) return res.status(400).json({ message: "User is not a member" }); if (String(group.ownerId) !== String(req.user._id) && group.admins.some((id) => String(id) === String(userId))) return res.status(403).json({ message: "Admins can only remove normal members" }); group.members = group.members.filter((id) => String(id) !== String(userId)); group.admins = group.admins.filter((id) => String(id) !== String(userId)); const sockets = getReceiverSocketId(userId); if (sockets) for (const socketId of sockets) io.to(socketId).emit("groupRemoved", { groupId: String(group._id) }); }
    else return res.status(400).json({ message: "Invalid member action" });
  }
  await group.save();
  res.json(await emitGroupUpdate(group));
}

export async function updateGroupMemberRole(req, res) {
  const { groupId, userId } = req.params;
  if (!validId(groupId) || !validId(userId)) return res.status(400).json({ message: "Invalid group or user ID" });
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (String(group.ownerId) !== String(req.user._id)) return res.status(403).json({ message: "Only the owner can manage admins" });
  if (!isMember(group, userId)) return res.status(400).json({ message: "User is not a member" });
  if (String(group.ownerId) === String(userId)) return res.status(400).json({ message: "The owner is already above admin" });
  if (group.admins.some((id) => String(id) === String(userId))) return res.status(409).json({ message: "User is already an admin" });
  if (req.body.role !== "admin") return res.status(400).json({ message: "Invalid group role" });
  group.admins.push(userId);
  await group.save();
  res.json(await emitGroupUpdate(group));
}