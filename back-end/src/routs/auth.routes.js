import express from "express";
import { checkAuth, syncProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/check", protectRoute, checkAuth);
router.patch("/profile", protectRoute, syncProfile);

export default router;
