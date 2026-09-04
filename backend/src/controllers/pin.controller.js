import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const MAX_PINS = 10;

function isMember(group, userId) {
  return group.members.some((memberId) => String(memberId) === String(userId));
}

async function accessMessage(messageId, userId, expectedGroupId) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) return { error: [400, "Invalid message ID"] };
  const message = await Message.findById(messageId);
  if (!message) return { error: [404, "Message not found"] };
  if (expectedGroupId && String(message.groupId) !== String(expectedGroupId)) return { error: [403, "Message is outside this group"] };
  if (message.groupId) {
    const group = await Group.findById(message.groupId).select("members admins ownerId");
    if (!group || !isMember(group, userId)) return { error: [403, "You are not a group member"] };
    return { message, group };
  }
  if (String(message.senderId) !== String(userId) && String(message.receiverId) !== String(userId)) return { error: [403, "You cannot pin this message"] };
  return { message };
}

function canManage(message, group, userId) {
  if (!group) return true;
  return String(group.ownerId) === String(userId) || group.admins.some((id) => String(id) === String(userId));
}

function emitPinUpdate(message, group) {
  const update = {
    messageId: String(message._id),
    isPinned: message.isPinned,
    pinnedAt: message.pinnedAt,
    pinnedBy: message.pinnedBy,
  };
  const userIds = group ? group.members : [message.senderId, message.receiverId];
  for (const userId of userIds) {
    const sockets = getReceiverSocketId(userId);
    if (sockets) io.to(sockets).emit("messagePinUpdated", update);
  }
}

export async function updatePin(req, res) {
  const result = await accessMessage(req.params.messageId, req.user._id, req.params.groupId);
  if (result.error) return res.status(...result.error).json({ message: result.error[1] });
  const { message, group } = result;
  if (!canManage(message, group, req.user._id)) return res.status(403).json({ message: "Only group admins can pin messages" });
  const pinned = req.body.pinned === true;
  if (pinned && !message.isPinned) {
    const query = group ? { groupId: message.groupId, isPinned: true } : { groupId: null, isPinned: true, $or: [{ senderId: message.senderId, receiverId: message.receiverId }, { senderId: message.receiverId, receiverId: message.senderId }] };
    if (await Message.countDocuments(query) >= MAX_PINS) return res.status(409).json({ message: "Maximum pinned messages reached" });
  }
  message.isPinned = pinned;
  message.pinnedAt = pinned ? new Date() : null;
  message.pinnedBy = pinned ? req.user._id : null;
  await message.save();
  emitPinUpdate(message, group);
  return res.json({ messageId: String(message._id), isPinned: message.isPinned, pinnedAt: message.pinnedAt, pinnedBy: message.pinnedBy });
}

export async function getPinnedMessages(req, res) {
  const isGroup = Boolean(req.params.groupId);
  const conversationId = req.params.groupId || req.params.userId;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) return res.status(400).json({ message: "Invalid conversation ID" });
  let query;
  if (isGroup) {
    const group = await Group.findById(conversationId).select("members");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, req.user._id)) return res.status(403).json({ message: "You are not a group member" });
    query = { groupId: conversationId, isPinned: true };
  } else {
    if (String(conversationId) === String(req.user._id)) return res.status(403).json({ message: "Invalid conversation" });
    query = { groupId: null, isPinned: true, $or: [{ senderId: req.user._id, receiverId: conversationId }, { senderId: conversationId, receiverId: req.user._id }] };
  }
  const messages = await Message.find(query).populate("senderId", "_id fullName username").sort({ pinnedAt: -1 }).limit(MAX_PINS);
  return res.json(messages);
}