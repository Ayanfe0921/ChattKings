import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    sticker: { type: String, maxlength: 20 },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      senderName: { type: String, maxlength: 120 },
      text: { type: String, maxlength: 500 },
      mediaType: { type: String, enum: ["image", "video", "sticker", "text"] },
    },
    reactions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true, maxlength: 16 },
    }],
    kind: {
      type: String,
      enum: ["message", "streak-notice"],
      default: "message",
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
