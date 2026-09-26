import express from "express";
import http from "http";
import { Server } from "socket.io";
import Call from "../models/call.model.js";
import Group from "../models/group.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: [allowedOrigin], credentials: true },
});

// Keep every connection for a user (multiple tabs/devices) in one room.
const userSocketMap = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(`user:${userId}`);
    const sockets = userSocketMap.get(userId) || new Set();
    sockets.add(socket.id);
    userSocketMap.set(userId, sockets);
  }

  socket.on("group:join", async ({ groupId } = {}) => {
    if (!userId || !groupId) return;
    const group = await Group.findOne({ _id: groupId, members: userId }).select("_id").lean();
    if (group) socket.join(`group:${groupId}`);
  });

  socket.on("group:leave", ({ groupId } = {}) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });

  // io.emit() sends event to everyone - broadcast
  io.emit("getOnlineUsers", [...userSocketMap.keys()]);

  socket.on("call:invite", async (payload = {}) => {
    const call = await Call.findById(payload.callId).lean();
    if (
      call &&
      String(call.callerId) === String(userId) &&
      String(call.receiverId) === String(payload.toUserId) &&
      call.status === "ringing"
    ) {
      io.to(`user:${call.receiverId}`).emit("call:incoming", {
        ...payload,
        fromUserId: String(userId),
      });
    }
  });

  socket.on("call:answer", async (payload = {}) => {
    const call = await Call.findById(payload.callId).lean();
    if (call && String(call.receiverId) === String(userId)) {
      io.to(`user:${call.callerId}`).emit("call:answer", {
        ...payload,
        fromUserId: String(userId),
      });
    }
  });

  socket.on("call:ice", async (payload = {}) => {
    const call = await Call.findById(payload.callId).lean();
    const isParticipant =
      call &&
      (String(call.callerId) === String(userId) ||
        String(call.receiverId) === String(userId));
    if (isParticipant && call.status !== "ended" && call.status !== "missed") {
      const peerId = String(call.callerId) === String(userId) ? call.receiverId : call.callerId;
      io.to(`user:${peerId}`).emit("call:ice", { ...payload, fromUserId: String(userId) });
    }
  });

  for (const eventName of ["call:decline", "call:end"]) {
    socket.on(eventName, async (payload = {}) => {
      const call = await Call.findById(payload.callId).lean();
      const isParticipant =
        call &&
        (String(call.callerId) === String(userId) ||
          String(call.receiverId) === String(userId));
      if (!isParticipant) return;
      const peerId = String(call.callerId) === String(userId) ? call.receiverId : call.callerId;
      io.to(`user:${peerId}`).emit(eventName, { ...payload, fromUserId: String(userId) });
    });
  }

  // socket.on is used to listen for events
  socket.on("disconnect", () => {
    if (userId) {
      const sockets = userSocketMap.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size === 0) userSocketMap.delete(userId);
    }
    io.emit("getOnlineUsers", [...userSocketMap.keys()]);
  });
});

export { app, server, io };
