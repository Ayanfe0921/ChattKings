import express from "express";
import { clearAIChat, getAIChat, sendAIMessage } from "../controllers/aiChat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/", getAIChat);
router.post("/", sendAIMessage);
router.delete("/", clearAIChat);
export default router;
