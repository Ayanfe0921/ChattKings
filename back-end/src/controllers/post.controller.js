import Post from "../models/post.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { io } from "../lib/socket.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getPosts(req, res) {
  try {
    const posts = await Post.find({ createdAt: { $gte: new Date(Date.now() - DAY_MS) } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "fullName profilePic");
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    res.status(500).json({ message: "Could not load posts" });
  }
}

export async function createPost(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a photo or video to post" });
    if (!hasImageKitConfig()) {
      return res.status(503).json({ message: "Media storage is not configured" });
    }
    const caption = String(req.body.caption || "").trim();
    if (caption.length > 300) {
      return res.status(400).json({ message: "Captions must be 300 characters or fewer" });
    }

    let mediaUrl;
    try {
      mediaUrl = await uploadChatMedia(req.file, "/posts");
    } catch (error) {
      console.error("Error uploading post media:", error);
      return res.status(502).json({ message: "Media storage could not accept this file" });
    }

    const post = await Post.create({
      userId: req.user._id,
      mediaUrl,
      mediaType: req.file.mimetype.startsWith("video/") ? "video" : "image",
      caption,
    });
    const populatedPost = await post.populate("userId", "fullName profilePic");
    io.emit("newPost", populatedPost);
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Could not create post" });
  }
}

export async function deletePost(req, res) {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found" });
    io.emit("deletePost", { postId: String(post._id) });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Could not delete post" });
  }
}
