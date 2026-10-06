import express from "express";
import { addGroupTask, createGroup, createGroupPoll, getGroupEligibleUsers, getGroupMessages, getGroups, sendGroupMessage, updateGroupTask, voteGroupPoll } from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/eligible-users", getGroupEligibleUsers);
router.get("/", getGroups);
router.post("/", createGroup);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);
router.post("/:id/tasks", addGroupTask);
router.patch("/:id/tasks/:taskId", updateGroupTask);
router.post("/:id/polls", createGroupPoll);
router.patch("/:groupId/polls/:messageId/vote", voteGroupPoll);
export default router;
