import express from "express";
import http from "http";
import { Server } from "socket.io";

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

  // io.emit() sends event to everyone - broadcast
  io.emit("getOnlineUsers", [...userSocketMap.keys()]);

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
