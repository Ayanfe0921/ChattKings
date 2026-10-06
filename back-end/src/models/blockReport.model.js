import mongoose from "mongoose";

const blockReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One account can contribute only one report toward another account's threshold.
blockReportSchema.index({ reporterId: 1, reportedUserId: 1 }, { unique: true });

export default mongoose.model("BlockReport", blockReportSchema);
