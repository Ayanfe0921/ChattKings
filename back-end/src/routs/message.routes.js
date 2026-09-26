import express from "express";
import {
  getConversationsForSidebar,
  getMessages,
  getStreaks,
  getUsersForSidebar,
  deleteMessage,
  setContactTag,
  setOnlineStatusVisibility,
  setMessagePin,
  markMessagesRead,
  sendMessage,
  toggleMessageReaction,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/streaks", getStreaks);
router.patch("/read/:id", markMessagesRead);
router.patch("/settings/online-status", setOnlineStatusVisibility);
router.put("/contacts/:peerId/tag", setContactTag);
router.delete("/:id", deleteMessage);
router.patch("/:id/reaction", toggleMessageReaction);
router.patch("/:id/pin", setMessagePin);
router.get("/:id", getMessages);
router.post("/send/:id", upload.single("media"), sendMessage);

export default router;
