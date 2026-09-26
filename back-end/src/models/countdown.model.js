import mongoose from "mongoose";

const countdownSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    eventAt: { type: Date, required: true },
    isDefault: { type: Boolean, default: false },
    defaultYear: { type: Number, default: null },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

countdownSchema.index(
  { ownerId: 1, defaultYear: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

export default mongoose.model("Countdown", countdownSchema);
