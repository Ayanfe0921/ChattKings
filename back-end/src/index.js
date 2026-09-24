import express from "express";
import cors from "cors";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { clerkMiddleware } from "@clerk/express";
import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../front-end/dist");

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Serve the built frontend
app.use(express.static(frontendDir));

app.get("/{*any}", (req, res, next) => {
  res.sendFile(path.join(frontendDir, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.listen(PORT, () => {
  connectDB();
  console.log("server is running on PORT:", PORT);
});