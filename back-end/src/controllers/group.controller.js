import mongoose from "mongoose";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io } from "../lib/socket.js";

const MAX_GROUP_MEMBERS = 50;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function eligiblePeerIds(userId) {
  const rows = await Message.aggregate([
    {
      $match: {
        groupId: null,
        kind: { $ne: "streak-notice" },
        $or: [{ senderId: userId }, { receiverId: userId }],
      },
    },
    {
      $project: {
        peerId: { $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"] },
        senderId: 1,
        createdAt: 1,
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      },
    },
    {
      $group: {
        _id: { peerId: "$peerId", senderId: "$senderId", day: "$day" },
        firstAt: { $min: "$createdAt" },
      },
    },
    {
      $group: {
        _id: { peerId: "$_id.peerId", senderId: "$_id.senderId" },
        days: { $sum: 1 },
        firstAt: { $min: "$firstAt" },
      },
    },
    {
      $group: {
        _id: "$_id.peerId",
        activity: { $push: { senderId: "$_id.senderId", days: "$days" } },
        firstAt: { $min: "$firstAt" },
      },
    },
    {
      $match: {
        firstAt: { $lte: new Date(Date.now() - THREE_DAYS_MS) },
        $expr: {
          $and: [
            { $eq: [{ $size: "$activity" }, 2] },
            { $allElementsTrue: { $map: { input: "$activity", as: "person", in: { $gte: ["$$person.days", 3] } } } },
          ],
        },
      },
    },
    { $project: { _id: 1 } },
  ]);
  return rows.map((row) => String(row._id));
}

export async function getGroupEligibleUsers(req, res) {
  try {
    const ids = await eligiblePeerIds(req.user._id);
    const users = await User.find({ _id: { $in: ids } }).select("fullName profilePic");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error loading eligible group members:", error);
    res.status(500).json({ message: "Could not load eligible people" });
  }
}

export async function getGroups(req, res) {
  try {
    const groups = await Group.find({ members: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("members", "fullName profilePic");
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error loading groups:", error);
    res.status(500).json({ message: "Could not load groups" });
  }
}

export async function createGroup(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const memberIds = [...new Set((Array.isArray(req.body.memberIds) ? req.body.memberIds : []).map(String))];
    const creatorId = String(req.user._id);
    const selectedIds = memberIds.filter((id) => id !== creatorId);
    if (!name || name.length > 60) return res.status(400).json({ message: "Group names must be 1–60 characters" });
    if (!selectedIds.length) return res.status(400).json({ message: "Add at least one person" });
    if (selectedIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: "One or more people are invalid" });
    if (selectedIds.length + 1 > MAX_GROUP_MEMBERS) {
      return res.status(400).json({ message: `Groups can have up to ${MAX_GROUP_MEMBERS} people, including you` });
    }

    const eligibleIds = new Set(await eligiblePeerIds(req.user._id));
    const ineligible = selectedIds.filter((id) => !eligibleIds.has(id));
    if (ineligible.length) return res.status(403).json({ message: "Every person must have chatted with you on at least 3 separate days over 3 days" });

    const usersExist = await User.countDocuments({ _id: { $in: selectedIds } });
    if (usersExist !== selectedIds.length) return res.status(400).json({ message: "One or more people could not be found" });
    const group = await Group.create({ name, createdBy: req.user._id, members: [req.user._id, ...selectedIds] });
    const populated = await group.populate("members", "fullName profilePic");
    for (const id of [creatorId, ...selectedIds]) io.to(`user:${id}`).emit("group:created", populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Could not create group" });
  }
}

export async function getGroupMessages(req, res) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id }).select("_id");
    if (!group) return res.status(404).json({ message: "Group not found" });
    const messages = await Message.find({ groupId: group._id }).sort({ createdAt: 1 }).populate("senderId", "fullName profilePic");
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error loading group messages:", error);
    res.status(500).json({ message: "Could not load group messages" });
  }
}

export async function sendGroupMessage(req, res) {
  try {
    const text = String(req.body.text || "").trim();
    const sticker = typeof req.body.sticker === "string" ? req.body.sticker : "";
    if ((!text && !sticker) || text.length > 6000 || sticker.length > 20) return res.status(400).json({ message: "Write a message or choose a sticker" });
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    let replyTo;
    if (req.body.replyToId) {
      const source = await Message.findOne({ _id: req.body.replyToId, groupId: group._id }).populate("senderId", "fullName");
      if (!source) return res.status(400).json({ message: "That group message cannot be replied to" });
      replyTo = {
        messageId: source._id,
        senderId: source.senderId._id,
        senderName: source.senderId.fullName,
        text: source.text || "",
        mediaType: source.image ? "image" : source.video ? "video" : source.sticker ? "sticker" : "text",
      };
    }
    const message = await Message.create({ groupId: group._id, senderId: req.user._id, text, sticker, replyTo });
    const populated = await message.populate("senderId", "fullName profilePic");
    group.updatedAt = new Date();
    await group.save();
    io.to(`group:${group._id}`).emit("group:message", populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Could not send group message" });
  }
}

export async function addGroupTask(req, res) {
  try {
    const text = String(req.body.text || "").trim();
    if (!text || text.length > 240) return res.status(400).json({ message: "Task must be 1–240 characters" });
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    group.tasks.push({ text, createdBy: req.user._id });
    await group.save();
    const updated = await Group.findById(group._id).populate("members", "fullName profilePic");
    for (const member of updated.members) io.to(`user:${member._id}`).emit("group:updated", updated);
    res.status(201).json(updated);
  } catch (error) {
    console.error("Error adding group task:", error);
    res.status(500).json({ message: "Could not add task" });
  }
}

export async function updateGroupTask(req, res) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    const task = group.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    task.completed = Boolean(req.body.completed);
    await group.save();
    const updated = await Group.findById(group._id).populate("members", "fullName profilePic");
    for (const member of updated.members) io.to(`user:${member._id}`).emit("group:updated", updated);
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating group task:", error);
    res.status(500).json({ message: "Could not update task" });
  }
}

export async function createGroupPoll(req, res) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    const question = String(req.body.question || "").trim();
    const options = [...new Set((Array.isArray(req.body.options) ? req.body.options : []).map((value) => String(value).trim()).filter(Boolean))];
    if (!question || question.length > 240 || options.length < 2 || options.length > 6 || options.some((option) => option.length > 100)) {
      return res.status(400).json({ message: "A poll needs a question and 2–6 options (maximum 100 characters each)" });
    }
    const message = await Message.create({ groupId: group._id, senderId: req.user._id, kind: "poll", poll: { question, options: options.map((text) => ({ text })) } });
    const populated = await message.populate("senderId", "fullName profilePic");
    io.to(`group:${group._id}`).emit("group:message", populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating group poll:", error);
    res.status(500).json({ message: "Could not create poll" });
  }
}

export async function voteGroupPoll(req, res) {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user._id }).select("_id");
    if (!group) return res.status(404).json({ message: "Group not found" });
    const message = await Message.findOne({ _id: req.params.messageId, groupId: group._id, kind: "poll" });
    if (!message) return res.status(404).json({ message: "Poll not found" });
    const optionIndex = Number(req.body.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= message.poll.options.length) return res.status(400).json({ message: "Choose a valid option" });
    for (const option of message.poll.options) option.votes = option.votes.filter((id) => String(id) !== String(req.user._id));
    message.poll.options[optionIndex].votes.push(req.user._id);
    await message.save();
    const populated = await Message.findById(message._id).populate("senderId", "fullName profilePic");
    io.to(`group:${group._id}`).emit("messageUpdated", populated);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Error voting in group poll:", error);
    res.status(500).json({ message: "Could not save poll vote" });
  }
}
