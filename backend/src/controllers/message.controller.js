import User from "../models/user.model.js";
import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const reactionEmojis = new Set(["❤️", "😂", "😮", "😢", "👍", "🔥", "😡"]);

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({
      _id: {
        $ne: loggedInUserId,
        $nin: req.user.blockedUsers || [],
      },
      blockedUsers: { $ne: loggedInUserId },
    }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const usersWhoBlockedMe = await User.find({ blockedUsers: loggedInUserId }).select("_id");
    const excludeIds = [
      ...(req.user.blockedUsers || []),
      ...usersWhoBlockedMe.map((u) => u._id),
    ];

    const conversations = await Message.aggregate([
      // 1. Keep only the messages I sent or received.
      {
        $match: {
          groupId: null,
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
          senderId: { $nin: excludeIds },
          receiverId: { $nin: excludeIds },
        },
      },
      { $sort: { createdAt: -1 } },
      // 2. Collapse them into one row per chat partner, keeping the latest message and unread count.
      {
        $group: {
          // The partner is the other person on the message (not me).
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", loggedInUserId] },
                    { $eq: ["$readAt", null] },
                    { $eq: ["$deletedAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // 3. Put the most recent conversation at the top.
      { $sort: { "lastMessage.createdAt": -1 } },
      // 4. Look up each partner's user profile (comes back as an array).
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      // 5. Pull that profile out of the array and make it the document.
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              { $first: "$user" },
              { lastMessage: "$lastMessage", unreadCount: "$unreadCount" },
            ],
          },
        },
      },
      // 6. Hide the private clerkId field from the result.
      { $project: { clerkId: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .populate({
        path: "replyTo",
        select: "_id text image video audio poll senderId createdAt deletedAt",
      })
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchMessages(req, res) {
  try {
    const { userId } = req.params;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid conversation user" });
    }
    if (!query) return res.status(200).json([]);

    const currentUserId = String(req.user._id);
    if (String(userId) === currentUserId) {
      return res.status(403).json({ message: "Invalid conversation" });
    }

    const targetUser = await User.findById(userId).select("_id blockedUsers");
    if (!targetUser) return res.status(404).json({ message: "Conversation user not found" });
    if (
      req.user.blockedUsers?.some((blockedId) => String(blockedId) === userId) ||
      targetUser.blockedUsers?.some((blockedId) => String(blockedId) === currentUserId)
    ) {
      return res.status(403).json({ message: "You cannot search this conversation" });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id },
      ],
      text: { $regex: escapedQuery, $options: "i" },
      deletedAt: null,
    })
      .select("_id text senderId createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(
      messages.map((message) => ({
        messageId: String(message._id),
        text: message.text,
        senderId: String(message.senderId),
        createdAt: message.createdAt,
      })),
    );
  } catch (error) {
    console.error("Error in searchMessages:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export async function editMessage(req, res) {
  try {
    const { messageId } = req.params;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    if (!text) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group?.members.some((id) => id.toString() === req.user._id.toString())) return res.status(403).json({ message: "You are not a group member" });
    }
    if (String(message.senderId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }
    if (message.deletedAt) {
      return res.status(400).json({ message: "Deleted messages cannot be edited" });
    }
    if (!message.text || message.image || message.video || message.audio) {
      return res.status(400).json({ message: "Only text messages can be edited" });
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();
    await message.populate({
      path: "replyTo",
      select: "_id text image video senderId createdAt deletedAt",
    });

    if (message.groupId) {
      const group = await Group.findById(message.groupId).select("members");
      for (const memberId of group?.members || []) { const sockets = getReceiverSocketId(memberId); if (sockets) io.to(sockets).emit("messageUpdated", message); }
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("messageUpdated", message);
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group?.members.some((id) => id.toString() === req.user._id.toString())) return res.status(403).json({ message: "You are not a group member" });
    }
    if (String(message.senderId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }
    if (message.deletedAt) return res.status(200).json(message);

    message.text = undefined;
    message.image = undefined;
    message.video = undefined;
    message.audio = undefined;
    message.isPinned = false;
    message.pinnedAt = null;
    message.pinnedBy = null;
    message.reactions = [];
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    const deletion = {
        messageId: String(message._id),
        deletedAt: message.deletedAt,
        deletedBy: String(message.deletedBy),
    };
    if (message.groupId) {
      const group = await Group.findById(message.groupId).select("members");
      for (const memberId of group?.members || []) { const sockets = getReceiverSocketId(memberId); if (sockets) io.to(sockets).emit("messageDeleted", deletion); }
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", deletion);
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesRead(req, res) {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    const unreadMessages = await Message.find({
      senderId,
      receiverId,
      readAt: null,
    }).select("_id");

    if (unreadMessages.length === 0) {
      return res.status(200).json({ messageIds: [] });
    }

    const messageIds = unreadMessages.map((message) => message._id);
    const readAt = new Date();
    await Message.updateMany(
      { _id: { $in: messageIds }, readAt: null },
      { $set: { readAt } },
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        messageIds: messageIds.map(String),
        readAt,
      });
    }

    return res.status(200).json({ messageIds: messageIds.map(String), readAt });
  } catch (error) {
    console.error("Error in markMessagesRead:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function reactToMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!reactionEmojis.has(emoji)) {
      return res.status(400).json({ message: "Unsupported reaction" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const group = message.groupId ? await Group.findById(message.groupId).select("members") : null;
    const isParticipant = message.groupId
      ? Boolean(group?.members.some((id) => String(id) === String(userId)))
      :
      String(message.senderId) === String(userId) ||
      String(message.receiverId) === String(userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "You cannot react to this message" });
    }
    if (message.deletedAt) {
      return res.status(400).json({ message: "Deleted messages cannot receive reactions" });
    }

    const reactions = message.reactions || [];
    const existingReactionIndex = reactions.findIndex(
      (reaction) => String(reaction.userId) === String(userId),
    );

    if (existingReactionIndex >= 0) {
      if (reactions[existingReactionIndex].emoji === emoji) {
        reactions.splice(existingReactionIndex, 1);
      } else {
        reactions[existingReactionIndex].emoji = emoji;
        reactions[existingReactionIndex].createdAt = new Date();
      }
    } else {
      reactions.push({ userId, emoji, createdAt: new Date() });
    }

    message.reactions = reactions;
    await message.save();

    const reactionUpdate = {
        messageId: String(message._id),
        reactions: message.reactions,
    };
    if (message.groupId) {
      for (const memberId of group.members) { if (String(memberId) === String(userId)) continue; const sockets = getReceiverSocketId(memberId); if (sockets) io.to(sockets).emit("messageReactionUpdated", reactionUpdate); }
    } else {
      const otherUserId = String(message.senderId) === String(userId) ? message.receiverId : message.senderId;
      const otherUserSocketId = getReceiverSocketId(otherUserId);
      if (otherUserSocketId) io.to(otherUserSocketId).emit("messageReactionUpdated", reactionUpdate);
    }

    return res.status(200).json({
      messageId: String(message._id),
      reactions: message.reactions,
    });
  } catch (error) {
    console.error("Error in reactToMessage:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const { replyTo } = req.body;

    // Privacy and block check
    const receiver = await User.findById(receiverId).select("privacySettings friends blockedUsers");
    if (!receiver) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (receiver.blockedUsers?.some((id) => id.equals(senderId))) {
      return res.status(403).json({ message: "Unable to send message" });
    }

    if (req.user.blockedUsers?.some((id) => id.equals(receiverId))) {
      return res.status(403).json({ message: "You have blocked this user" });
    }

    const permission = receiver.privacySettings?.messagePermission ?? "everyone";
    if (
      permission === "friends_only" &&
      !receiver.friends.some((fid) => fid.equals(senderId))
    ) {
      return res.status(403).json({ message: "This user only accepts messages from friends." });
    }

    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo).select("_id senderId receiverId");
      if (!replyToMessage) {
        return res.status(400).json({ message: "Original message not found" });
      }

      const isSameConversation =
        (String(replyToMessage.senderId) === String(senderId) &&
          String(replyToMessage.receiverId) === String(receiverId)) ||
        (String(replyToMessage.senderId) === String(receiverId) &&
          String(replyToMessage.receiverId) === String(senderId));
      if (!isSameConversation) {
        return res.status(400).json({ message: "Original message is outside this conversation" });
      }
    }

    let imageUrl;
    let videoUrl;
    let audioData;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "Media upload is not configured" });
      }

      let audioDuration;
      if (req.file.mimetype.startsWith("audio/")) {
        audioDuration = Number(req.body.audioDuration);
        if (!Number.isFinite(audioDuration) || audioDuration <= 0 || audioDuration > 300) {
          return res.status(400).json({ message: "Audio duration must be between 1 and 300 seconds" });
        }
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else if (req.file.mimetype.startsWith("audio/")) {
        audioData = { url, duration: audioDuration };
      } else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      replyTo: replyToMessage?._id || null,
      text,
      image: imageUrl,
      video: videoUrl,
      audio: audioData,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) newMessage.deliveredAt = new Date();
    await newMessage.save();
    await newMessage.populate({
      path: "replyTo",
      select: "_id text image video audio poll senderId createdAt deletedAt",
    });

    // only send the message in realtime if user is online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", {
          messageId: String(newMessage._id),
          deliveredAt: newMessage.deliveredAt,
        });
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}