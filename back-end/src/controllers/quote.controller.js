import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import { io } from "../lib/socket.js";

const fallbackQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
];

export async function getRandomQuote(req, res) {
  try {
    const response = await fetch("https://dummyjson.com/quotes/random", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Quote service returned ${response.status}`);
    const quote = await response.json();
    if (!quote.quote || !quote.author) throw new Error("Quote service returned an invalid quote");
    res.status(200).json({ text: quote.quote, author: quote.author });
  } catch {
    res.status(200).json(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]);
  }
}

export async function createQuotePost(req, res) {
  try {
    const quoteText = String(req.body.text || "").trim();
    const quoteAuthor = String(req.body.author || "").trim();
    if (!quoteText || quoteText.length > 1000 || quoteAuthor.length > 160) {
      return res.status(400).json({ message: "Choose a valid quote" });
    }
    const post = await Post.create({ userId: req.user._id, mediaType: "quote", quoteText, quoteAuthor });
    const populatedPost = await post.populate("userId", "fullName profilePic");
    io.emit("newPost", populatedPost);
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error posting quote:", error);
    res.status(500).json({ message: "Could not post this quote" });
  }
}

export async function shareQuoteToConversation(req, res) {
  try {
    const peerId = String(req.body.peerId || "");
    const quoteText = String(req.body.text || "").trim();
    const quoteAuthor = String(req.body.author || "").trim();
    if (!mongoose.isValidObjectId(peerId) || peerId === String(req.user._id)) {
      return res.status(400).json({ message: "Choose a chat contact" });
    }
    if (!quoteText || quoteText.length > 1000 || quoteAuthor.length > 160) {
      return res.status(400).json({ message: "Choose a valid quote" });
    }
    const hasConversation = await Message.exists({
      groupId: null,
      $or: [
        { senderId: req.user._id, receiverId: peerId },
        { senderId: peerId, receiverId: req.user._id },
      ],
    });
    if (!hasConversation) return res.status(403).json({ message: "Quotes can only be shared with people you have already chatted with" });

    const text = `“${quoteText}”${quoteAuthor ? ` — ${quoteAuthor}` : ""}`;
    const message = await Message.create({ senderId: req.user._id, receiverId: peerId, text });
    io.to(`user:${peerId}`).emit("newMessage", message);
    res.status(201).json(message);
  } catch (error) {
    console.error("Error sharing quote:", error);
    res.status(500).json({ message: "Could not share this quote" });
  }
}
