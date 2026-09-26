import { CronJob } from "cron";
import Countdown from "../models/countdown.model.js";
import CountdownNotification from "../models/countdownNotification.model.js";
import { io } from "./socket.js";

async function sendDueReminders() {
  const now = new Date();
  const latestEventTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueCountdowns = await Countdown.find({
    eventAt: { $gt: now, $lte: latestEventTime },
    reminderSentAt: null,
  });

  for (const countdown of dueCountdowns) {
    const claimed = await Countdown.findOneAndUpdate(
      { _id: countdown._id, reminderSentAt: null },
      { $set: { reminderSentAt: now } },
      { new: true },
    );
    if (!claimed) continue;

    const notice = await CountdownNotification.create({
      ownerId: countdown.ownerId,
      countdownId: countdown._id,
      title: countdown.title,
      text: `${countdown.title} is in 3 days.`,
      eventAt: countdown.eventAt,
    });
    io.to(`user:${countdown.ownerId}`).emit("countdownReminder", notice);
  }
}

const countdownReminderJob = new CronJob("*/5 * * * *", () => {
  sendDueReminders().catch((error) =>
    console.error("Countdown reminder job failed:", error),
  );
});

export default countdownReminderJob;
