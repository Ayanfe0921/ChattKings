import mongoose from "mongoose";

const streakSchema = new mongoose.Schema(
  {
    userA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activeDayKey: { type: String, default: "" },
    activeDaySenders: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastQualifiedDayKey: { type: String, default: "" },
    currentCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    reachedMilestones: { type: [Number], default: [] },
  },
  { timestamps: true },
);

streakSchema.index({ userA: 1, userB: 1 }, { unique: true });

export default mongoose.model("Streak", streakSchema);
