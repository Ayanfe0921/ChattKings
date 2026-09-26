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
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    kind: {
      type: String,
      enum: ["message", "streak-notice"],
      default: "message",
    },
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
