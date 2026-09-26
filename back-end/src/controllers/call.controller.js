import Call from "../models/call.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function getEligibility(myId, peerId) {
  if (!mongoose.isValidObjectId(peerId) || String(myId) === String(peerId)) {
    return { eligible: false, activeDays: 0, firstMessageAt: null };
  }
  const activity = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: myId, receiverId: peerId },
          { senderId: peerId, receiverId: myId },
        ],
        kind: { $ne: "streak-notice" },
      },
    },
    {
      $project: {
        senderId: 1,
        createdAt: 1,
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      },
    },
    {
      $group: {
        _id: { senderId: "$senderId", day: "$day" },
        firstMessageAt: { $min: "$createdAt" },
      },
    },
    {
      $group: {
        _id: "$_id.senderId",
        activeDays: { $sum: 1 },
        firstMessageAt: { $min: "$firstMessageAt" },
      },
    },
  ]);

  const bothHaveThreeDays = [String(myId), String(peerId)].every((id) =>
    activity.some((entry) => String(entry._id) === id && entry.activeDays >= 3),
  );
  const firstMessageAt = activity.reduce(
    (earliest, entry) =>
      !earliest || entry.firstMessageAt < earliest ? entry.firstMessageAt : earliest,
    null,
  );
  const oldEnough = firstMessageAt && Date.now() - firstMessageAt.getTime() >= THREE_DAYS_MS;

  return {
    eligible: Boolean(bothHaveThreeDays && oldEnough),
    activeDays: activity.reduce((sum, entry) => sum + entry.activeDays, 0),
    firstMessageAt,
  };
}

export async function checkCallEligibility(req, res) {
  try {
    const result = await getEligibility(req.user._id, req.params.peerId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error checking call eligibility:", error);
    res.status(500).json({ message: "Could not check call eligibility" });
  }
}

export async function createCall(req, res) {
  try {
    const { peerId, callType } = req.body;
    if (!mongoose.isValidObjectId(peerId) || String(req.user._id) === String(peerId)) {
      return res.status(400).json({ message: "Choose a valid person to call" });
    }
    if (!["voice", "video"].includes(callType)) {
      return res.status(400).json({ message: "Choose a voice or video call" });
    }
    const eligibility = await getEligibility(req.user._id, peerId);
    if (!eligibility.eligible) {
      return res.status(403).json({
        message: "Calls unlock after both people have chatted on at least 3 days over 3 days.",
        eligibility,
      });
    }

    const call = await Call.create({
      callerId: req.user._id,
      receiverId: peerId,
      callType,
    });
    res.status(201).json(call);
  } catch (error) {
    console.error("Error creating call:", error);
    res.status(500).json({ message: "Could not start call" });
  }
}

export async function acceptCall(req, res) {
  try {
    const call = await Call.findOneAndUpdate(
      { _id: req.params.id, receiverId: req.user._id, status: "ringing" },
      { $set: { status: "answered", answeredAt: new Date() } },
      { new: true },
    );
    if (!call) return res.status(404).json({ message: "Call is no longer available" });
    res.status(200).json(call);
  } catch (error) {
    console.error("Error accepting call:", error);
    res.status(500).json({ message: "Could not accept call" });
  }
}

export async function finishCall(req, res) {
  try {
    const { status = "ended" } = req.body;
    if (!["missed", "declined", "ended"].includes(status)) {
      return res.status(400).json({ message: "Invalid call status" });
    }
    const call = await Call.findOne({
      _id: req.params.id,
      $or: [{ callerId: req.user._id }, { receiverId: req.user._id }],
    });
    if (!call) return res.status(404).json({ message: "Call not found" });
    if (call.endedAt) return res.status(200).json(call);

    call.status = status;
    call.endedAt = new Date();
    call.durationSeconds = call.answeredAt
      ? Math.max(0, Math.floor((call.endedAt - call.answeredAt) / 1000))
      : 0;
    await call.save();
    res.status(200).json(call);
  } catch (error) {
    console.error("Error finishing call:", error);
    res.status(500).json({ message: "Could not finish call" });
  }
}

export async function getCallHistory(req, res) {
  try {
    const calls = await Call.find({
      $or: [{ callerId: req.user._id }, { receiverId: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");
    res.status(200).json(calls);
  } catch (error) {
    console.error("Error loading call history:", error);
    res.status(500).json({ message: "Could not load call history" });
  }
}
