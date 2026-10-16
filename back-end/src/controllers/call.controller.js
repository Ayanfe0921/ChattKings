import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import { isUserOnline } from "../lib/socket.js";

async function markStaleRingingCallsMissed() {
  const staleBefore = new Date(Date.now() - 60_000);
  await Call.updateMany(
    { status: "ringing", endedAt: null, createdAt: { $lt: staleBefore } },
    { $set: { status: "missed", endedAt: new Date() } },
  );
}

export async function checkCallEligibility(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.peerId)) return res.status(200).json({ eligible: false });
    const receiver = await User.findById(req.params.peerId).select("allowedCallers showReadReceipts").lean();
    const allowlisted = receiver?.allowedCallers?.some((id) => String(id) === String(req.user._id));
    const allowed = receiver?.showReadReceipts !== false || Boolean(allowlisted);
    const result = { eligible: Boolean(allowed), allowedByRecipient: Boolean(allowlisted) };
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
    const receiver = await User.findById(peerId).select("allowedCallers showReadReceipts").lean();
    const allowlisted = receiver?.allowedCallers?.some((id) => String(id) === String(req.user._id));
    if (!receiver || (receiver.showReadReceipts === false && !allowlisted)) {
      return res.status(403).json({
        message: "Unreachable",
      });
    }

    await markStaleRingingCallsMissed();
    const anotherActiveCall = await Call.exists({
      status: { $in: ["ringing", "answered"] },
      endedAt: null,
      $or: [{ callerId: peerId }, { receiverId: peerId }],
    });
    const outcome = !isUserOnline(peerId) ? "missed" : anotherActiveCall ? "busy" : "ringing";
    const now = new Date();
    const call = await Call.create({
      callerId: req.user._id,
      receiverId: peerId,
      callType,
      status: outcome,
      endedAt: outcome === "ringing" ? null : now,
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
    if (!["missed", "busy", "declined", "ended"].includes(status)) {
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
    await markStaleRingingCallsMissed();
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
