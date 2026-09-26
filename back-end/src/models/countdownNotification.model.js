import mongoose from "mongoose";

const countdownNotificationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    countdownId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Countdown",
      required: true,
    },
    title: { type: String, required: true },
    text: { type: String, required: true },
    eventAt: { type: Date, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("CountdownNotification", countdownNotificationSchema);
