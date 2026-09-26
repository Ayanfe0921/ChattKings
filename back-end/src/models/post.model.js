import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    caption: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

postSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86_400 });

export default mongoose.model("Post", postSchema);
