import express from "express";
import cors from "cors";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { clerkMiddleware } from "@clerk/express";
import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";
import clerk from "./webhooks/clerk.js";
import authRoutes from "./routs/auth.routes.js";
import messageRoutes from "./routs/message.routes.js";
import countdownRoutes from "./routs/countdown.routes.js";
import countdownReminderJob from "./lib/countdownReminders.js";
import callRoutes from "./routs/call.routes.js";
import postRoutes from "./routs/post.routes.js";
import groupRoutes from "./routs/group.routes.js";
import aiChatRoutes from "./routs/aiChat.routes.js";
import quoteRoutes from "./routs/quote.routes.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../front-end/dist");

app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerk,
);

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/countdowns", countdownRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/quotes", quoteRoutes);

// Serve the built frontend
app.use(express.static(frontendDir));

app.get("/{*any}", (req, res, next) => {
  res.sendFile(path.join(frontendDir, "index.html"), (error) => {
    if (error) next(error);
  });
});

server.listen(PORT, () => {
  connectDB()
    .then(() => countdownReminderJob.start())
    .catch((error) => console.error("Countdown reminders could not start:", error));
  console.log("server is running on PORT:", PORT);

  if (process.env.NODE_ENV === "production") job.start();
});
