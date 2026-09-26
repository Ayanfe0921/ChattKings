import express from "express";
import { createGroup, getGroupEligibleUsers, getGroupMessages, getGroups, sendGroupMessage } from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/eligible-users", getGroupEligibleUsers);
router.get("/", getGroups);
router.post("/", createGroup);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);
export default router;
