import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const MAX_OPTIONS = 8;

function isMember(group, userId) {
  return group.members.some((memberId) => String(memberId) === String(userId));
}

function pollForClient(message) {
  return {
    messageId: String(message._id),
    poll: message.poll,
  };
}

function broadcastPollUpdate(message, group) {
  const update = pollForClient(message);
  if (group) {
    for (const memberId of group.members) {
      const sockets = getReceiverSocketId(memberId);
      if (sockets && Array.isArray(sockets)) {
        for (const socketId of sockets) {
          io.to(socketId).emit("pollUpdated", update);
        }
      } else if (sockets) {
        io.to(sockets).emit("pollUpdated", update);
      }
    }
    return;
  }
  for (const userId of [message.senderId, message.receiverId]) {
    const sockets = getReceiverSocketId(userId);
    if (sockets && Array.isArray(sockets)) {
      for (const socketId of sockets) {
        io.to(socketId).emit("pollUpdated", update);
      }
    } else if (sockets) {
      io.to(sockets).emit("pollUpdated", update);
    }
  }
}

async function sendPoll(req, res, conversation) {
  const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
  const rawOptions = Array.isArray(req.body.options) ? req.body.options : [];
  const options = rawOptions.map((option) => typeof option === "string" ? option.trim() : "");

  if (!question || question.length > 240) return res.status(400).json({ message: "Poll question must be between 1 and 240 characters" });
  if (options.length < 2 || options.length > MAX_OPTIONS) return res.status(400).json({ message: "Polls must have between 2 and 8 options" });
  if (options.some((option) => !option || option.length > 120)) return res.status(400).json({ message: "Poll options must be between 1 and 120 characters" });
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) return res.status(400).json({ message: "Poll options must be unique" });

  const message = await Message.create({
    senderId: req.user._id,
    ...conversation,
    poll: { question, options: options.map((text) => ({ text, votes: [] })) },
    deliveredAt: conversation.receiverId && getReceiverSocketId(conversation.receiverId) ? new Date() : null,
  });

  if (conversation.groupId) {
    for (const memberId of conversation.group.members) {
      if (String(memberId) === String(req.user._id)) continue;
      const sockets = getReceiverSocketId(memberId) || [];
      for (const socketId of sockets) {
        io.to(socketId).emit("newGroupMessage", message);
      }
    }
  } else {
    const sockets = getReceiverSocketId(conversation.receiverId) || [];
    for (const socketId of sockets) {
      io.to(socketId).emit("newMessage", message);
    }
  }
  return res.status(201).json(message);
}

export async function createPrivatePoll(req, res) {
  const { id: receiverId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(receiverId) || String(receiverId) === String(req.user._id)) return res.status(400).json({ message: "Invalid conversation user" });
  const receiver = await User.findById(receiverId).select("blockedUsers privacySettings friends");
  if (!receiver) return res.status(404).json({ message: "Recipient not found" });
  if (receiver.blockedUsers?.some((id) => String(id) === String(req.user._id)) || req.user.blockedUsers?.some((id) => String(id) === receiverId)) return res.status(403).json({ message: "Unable to send poll" });
  if (receiver.privacySettings?.messagePermission === "friends_only" && !receiver.friends.some((id) => String(id) === String(req.user._id))) return res.status(403).json({ message: "This user only accepts messages from friends." });
  return sendPoll(req, res, { receiverId });
}

export async function createGroupPoll(req, res) {
  const group = await Group.findById(req.params.groupId).select("members");
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!isMember(group, req.user._id)) return res.status(403).json({ message: "You are not a group member" });
  return sendPoll(req, res, { groupId: group._id, group });
}

async function getAccessibleMessage(messageId, userId) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) return { error: [400, "Invalid message ID"] };
  const message = await Message.findById(messageId);
  if (!message) return { error: [404, "Message not found"] };
  if (!message.poll) return { error: [400, "Message does not contain a poll"] };
  if (message.groupId) {
    const group = await Group.findById(message.groupId).select("members admins ownerId");
    if (!group || !isMember(group, userId)) return { error: [403, "You are not a group member"] };
    return { message, group };
  }
  if (String(message.senderId) !== String(userId) && String(message.receiverId) !== String(userId)) return { error: [403, "You cannot access this poll"] };
  return { message };
}

export async function votePoll(req, res) {
  const optionIndex = Number(req.body.optionIndex);
  if (!Number.isInteger(optionIndex) || optionIndex < 0) return res.status(400).json({ message: "Invalid poll option" });
  const result = await getAccessibleMessage(req.params.messageId, req.user._id);
  if (result.error) return res.status(...result.error).json({ message: result.error[1] });
  const { message, group } = result;
  if (message.poll.isClosed) return res.status(409).json({ message: "This poll is closed" });
  if (optionIndex >= message.poll.options.length) return res.status(400).json({ message: "Invalid poll option" });
  for (const option of message.poll.options) option.votes = option.votes.filter((userId) => String(userId) !== String(req.user._id));
  const selectedOption = message.poll.options[optionIndex];
  selectedOption.votes.push(req.user._id);
  await message.save();
  broadcastPollUpdate(message, group);
  return res.json(pollForClient(message));
}

export async function closePoll(req, res) {
  const result = await getAccessibleMessage(req.params.messageId, req.user._id);
  if (result.error) return res.status(...result.error).json({ message: result.error[1] });
  const { message, group } = result;
  const canClose = String(message.senderId) === String(req.user._id) || Boolean(group && (String(group.ownerId) === String(req.user._id) || group.admins.some((id) => String(id) === String(req.user._id))));
  if (!canClose) return res.status(403).json({ message: "Only the poll creator or a group admin can close this poll" });
  if (!message.poll.isClosed) {
    message.poll.isClosed = true;
    message.poll.closedAt = new Date();
    await message.save();
  }
  broadcastPollUpdate(message, group);
  return res.json(pollForClient(message));
}