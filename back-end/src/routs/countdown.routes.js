import express from "express";
import {
  createCountdown,
  deleteCountdown,
  getCountdowns,
} from "../controllers/countdown.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/", getCountdowns);
router.post("/", createCountdown);
router.delete("/:id", deleteCountdown);

export default router;
