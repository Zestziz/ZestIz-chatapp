import express from "express";
import http from "http";
import { Server } from "socket.io";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, { cors: { origin: [allowedOrigin] } });

function getReceiverSocketId(userId) {
  return userSocketMap[userId] ? [...userSocketMap[userId]] : undefined;
}

async function deliverPendingMessages(receiverId) {
  const pendingMessages = await Message.find({
    receiverId,
    deliveredAt: null,
  }).select("_id senderId");

  if (pendingMessages.length === 0) return;

  const deliveredAt = new Date();
  await Message.updateMany(
    { _id: { $in: pendingMessages.map((message) => message._id) }, deliveredAt: null },
    { $set: { deliveredAt } },
  );

  const messagesBySender = new Map();
  for (const message of pendingMessages) {
    const senderId = String(message.senderId);
    const messageIds = messagesBySender.get(senderId) || [];
    messageIds.push(String(message._id));
    messagesBySender.set(senderId, messageIds);
  }

  for (const [senderId, messageIds] of messagesBySender) {
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDelivered", { messageIds, deliveredAt });
    }
  }
}

// online users map = { userId: Set<socketId> }
const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] ??= new Set();
    userSocketMap[userId].add(socket.id);
  }

  // io.emit() sends event to everyone - broadcast
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  if (userId) {
    deliverPendingMessages(userId).catch((error) => {
      console.error("Error delivering pending messages:", error.message);
    });
  }

  // Listen for typing events
  socket.on("typing", async ({ receiverId, groupId }) => {
    if (!userId) return;
    if (groupId) {
      const group = await Group.findById(groupId).select("members");
      if (!group?.members.some((memberId) => String(memberId) === String(userId))) return;
      for (const memberId of group.members) {
        if (String(memberId) === String(userId)) continue;
        const sockets = getReceiverSocketId(memberId);
        if (sockets) io.to(sockets).emit("groupTyping", { groupId, senderId: userId });
      }
      return;
    }
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  // Listen for stop-typing events
  socket.on("stopTyping", async ({ receiverId, groupId }) => {
    if (!userId) return;
    if (groupId) {
      const group = await Group.findById(groupId).select("members");
      if (!group?.members.some((memberId) => String(memberId) === String(userId))) return;
      for (const memberId of group.members) {
        if (String(memberId) === String(userId)) continue;
        const sockets = getReceiverSocketId(memberId);
        if (sockets) io.to(sockets).emit("groupStopTyping", { groupId, senderId: userId });
      }
      return;
    }
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  // socket.on is used to listen for events
  socket.on("disconnect", () => {
    if (!userId || !userSocketMap[userId]) return;

    userSocketMap[userId].delete(socket.id);
    if (userSocketMap[userId].size > 0) return;

    delete userSocketMap[userId];
    const lastSeen = new Date();
    User.findByIdAndUpdate(userId, { lastSeen }).catch((error) => {
      console.error("Error updating lastSeen:", error.message);
    });
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    io.emit("userOffline", { userId, lastSeen });
  });
});

export { app, server, io, getReceiverSocketId };