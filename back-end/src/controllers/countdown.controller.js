import Countdown from "../models/countdown.model.js";
import CountdownNotification from "../models/countdownNotification.model.js";

export async function getCountdowns(req, res) {
  try {
    const ownerId = req.user._id;
    const defaultYear = Number(req.query.year);
    const defaultAt = new Date(req.query.newYearAt);

    if (
      Number.isInteger(defaultYear) &&
      Number.isFinite(defaultAt.getTime()) &&
      defaultAt.getTime() > Date.now()
    ) {
      try {
        await Countdown.findOneAndUpdate(
          { ownerId, isDefault: true, defaultYear },
          {
            $setOnInsert: {
              ownerId,
              isDefault: true,
              defaultYear,
              title: `New Year ${defaultYear}`,
              eventAt: defaultAt,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    const yearFilter = Number.isInteger(defaultYear)
      ? { $or: [{ isDefault: false }, { defaultYear: { $gte: defaultYear } }] }
      : {};
    const [countdowns, notifications] = await Promise.all([
      Countdown.find({ ownerId, ...yearFilter }).sort({ eventAt: 1 }),
      CountdownNotification.find({ ownerId, readAt: null }).sort({ createdAt: 1 }),
    ]);

    if (notifications.length) {
      await CountdownNotification.updateMany(
        { ownerId, _id: { $in: notifications.map((notice) => notice._id) } },
        { $set: { readAt: new Date() } },
      );
    }

    res.status(200).json({ countdowns, notifications });
  } catch (error) {
    console.error("Error in getCountdowns:", error);
    res.status(500).json({ message: "Failed to load countdowns" });
  }
}

export async function createCountdown(req, res) {
  try {
    const title = String(req.body.title || "").trim();
    const eventAt = new Date(req.body.eventAt);
    if (!title || title.length > 80 || !Number.isFinite(eventAt.getTime())) {
      return res.status(400).json({ message: "Enter a title and a valid event date" });
    }
    if (eventAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Choose a future date and time" });
    }

    const countdown = await Countdown.create({ ownerId: req.user._id, title, eventAt });
    res.status(201).json(countdown);
  } catch (error) {
    console.error("Error in createCountdown:", error);
    res.status(500).json({ message: "Failed to create countdown" });
  }
}

export async function deleteCountdown(req, res) {
  try {
    const countdown = await Countdown.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
      isDefault: false,
    });
    if (!countdown) {
      return res.status(404).json({ message: "Countdown not found or cannot be removed" });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in deleteCountdown:", error);
    res.status(500).json({ message: "Failed to remove countdown" });
  }
}
