import express from "express";
import {
  acceptCall,
  checkCallEligibility,
  createCall,
  finishCall,
  getCallHistory,
} from "../controllers/call.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/history", getCallHistory);
router.get("/eligibility/:peerId", checkCallEligibility);
router.post("/", createCall);
router.patch("/:id/accept", acceptCall);
router.patch("/:id/finish", finishCall);

export default router;
