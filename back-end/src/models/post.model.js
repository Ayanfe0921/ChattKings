import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: function () { return this.mediaType !== "quote"; } },
    mediaType: { type: String, enum: ["image", "video", "quote"], required: true },
    quoteText: { type: String, trim: true, maxlength: 1000, default: "" },
    quoteAuthor: { type: String, trim: true, maxlength: 160, default: "" },
    caption: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

postSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86_400 });

export default mongoose.model("Post", postSchema);
