import express from "express";
import { createPost, createQuotePost, deletePost, getPosts } from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();
router.use(protectRoute);
router.get("/", getPosts);
router.post("/quote", createQuotePost);
router.post("/", upload.single("media"), createPost);
router.delete("/:id", deletePost);

export default router;
