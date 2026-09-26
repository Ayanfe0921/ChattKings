import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Streak from "../models/streak.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { io } from "../lib/socket.js";

const STREAK_MILESTONES = [100, 500, 1000, 5000];

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function previousDayKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDayKey(date);
}

function toStreakSummary(streak, today = utcDayKey()) {
  const yesterday = previousDayKey(today);
  const days =
    streak.lastQualifiedDayKey === today || streak.lastQualifiedDayKey === yesterday
      ? streak.currentCount
      : 0;
  return { days, lastQualifiedDayKey: streak.lastQualifiedDayKey };
}

async function recordImageStreak(senderId, receiverId) {
  const [userA, userB] = [String(senderId), String(receiverId)].sort();
  const today = utcDayKey();
  const yesterday = previousDayKey(today);
  try {
    await Streak.findOneAndUpdate(
      { userA, userB },
      { $setOnInsert: { userA, userB } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    // Two first-time image uploads can race to create the same unique pair.
    if (error.code !== 11000) throw error;
  }

  // Reset the sender list once per day, then add atomically. These operator
  // updates work on older MongoDB versions that don't support update pipelines.
  await Streak.updateOne(
    { userA, userB, activeDayKey: { $ne: today } },
    { $set: { activeDayKey: today, activeDaySenders: [senderId] } },
  );
  await Streak.updateOne(
    { userA, userB, activeDayKey: today },
    { $addToSet: { activeDaySenders: senderId } },
  );

  // Only one request can qualify a given day and create its milestone notice.
  let qualifiedStreak = await Streak.findOneAndUpdate(
    {
      userA,
      userB,
      activeDayKey: today,
      activeDaySenders: { $all: [userA, userB] },
      lastQualifiedDayKey: yesterday,
    },
    { $inc: { currentCount: 1 }, $set: { lastQualifiedDayKey: today } },
    { new: true },
  );

  if (!qualifiedStreak) {
    qualifiedStreak = await Streak.findOneAndUpdate(
      {
        userA,
        userB,
        activeDayKey: today,
        activeDaySenders: { $all: [userA, userB] },
        lastQualifiedDayKey: { $nin: [today, yesterday] },
      },
      {
        $set: {
          currentCount: 1,
          startedAt: new Date(),
          lastQualifiedDayKey: today,
        },
      },
      { new: true },
    );
  }

  let noticeText = null;
  if (qualifiedStreak) {
    if (qualifiedStreak.currentCount === 1) {
      noticeText = "You started a media streak with each other! 🔥";
    } else if (
      STREAK_MILESTONES.includes(qualifiedStreak.currentCount) &&
      !qualifiedStreak.reachedMilestones.includes(qualifiedStreak.currentCount)
    ) {
      const milestone = qualifiedStreak.currentCount;
      await Streak.updateOne({ _id: qualifiedStreak._id }, { $addToSet: { reachedMilestones: milestone } });
      noticeText =
        milestone === 5000
          ? "You reached the 5 decade media streak milestone! 🎉"
          : `You reached the ${milestone}-day media streak milestone! 🎉`;
    }
  }

  const streak = await Streak.findOne({ userA, userB });
  const summary = toStreakSummary(streak, today);
  io.to(`user:${userA}`).emit("streakUpdate", { peerId: userB, ...summary });
  io.to(`user:${userB}`).emit("streakUpdate", { peerId: userA, ...summary });

  let notice = null;
  if (noticeText) {
    notice = await Message.create({
      senderId,
      receiverId,
      text: noticeText,
      kind: "streak-notice",
    });
    io.to(`user:${userA}`).emit("streakNotice", notice);
    io.to(`user:${userB}`).emit("streakNotice", notice);
  }

  return { summary, notice };
}

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const [filteredUsers, me] = await Promise.all([User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId").lean(), User.findById(loggedInUserId).select("contactTags").lean()]);
    const tags = me?.contactTags || {};
    filteredUsers.forEach((user) => { user.contactTag = tags[String(user._id)] || ""; });

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const [conversations, me] = await Promise.all([Message.aggregate([
      // 1. Keep only the messages I sent or received.
      {
        $match: {
          groupId: null,
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // Sort newest first so the grouped preview fields describe the latest message.
      { $sort: { createdAt: -1 } },
      // Collapse messages into one row per partner and count unread incoming messages.
      {
        $group: {
          // The partner is the other person on the message (not me).
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $first: "$createdAt" },
          lastMessageText: {
            $first: {
              $ifNull: [
                "$text",
                { $cond: [{ $ne: ["$image", null] }, "Photo", { $cond: [{ $ne: ["$video", null] }, "Video", { $cond: [{ $ne: ["$audio", null] }, "Voice note", { $cond: [{ $ne: ["$sticker", null] }, "Sticker", "Message"] }] }] }] },
              ],
            },
          },
          lastMessageSenderId: { $first: "$senderId" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", loggedInUserId] },
                    { $eq: [{ $ifNull: ["$readAt", null] }, null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // 3. Put the most recent conversation at the top.
      { $sort: { lastMessageAt: -1 } },
      // 4. Look up each partner's user profile (comes back as an array).
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // 5. Pull that profile out of the array and make it the document.
      { $unwind: "$user" },
      {
        $addFields: {
          "user.lastMessageText": "$lastMessageText",
          "user.lastMessageSenderId": "$lastMessageSenderId",
          "user.unreadCount": "$unreadCount",
          "user.lastMessageAt": "$lastMessageAt",
        },
      },
      { $replaceRoot: { newRoot: "$user" } },
      // 6. Hide the private clerkId field from the result.
      { $project: { clerkId: 0 } },
    ]), User.findById(loggedInUserId).select("contactTags").lean()]);
    const tags = me?.contactTags || {};
    conversations.forEach((user) => { user.contactTag = tags[String(user._id)] || ""; });

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId },
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesRead(req, res) {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    await Message.updateMany(
      { senderId, receiverId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    io.to(`user:${receiverId}`).emit("messagesRead", { peerId: String(senderId) });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in markMessagesRead:", error);
    res.status(500).json({ message: "Could not mark messages as read" });
  }
}

export async function getStreaks(req, res) {
  try {
    const userId = req.user._id;
    const streaks = await Streak.find({ $or: [{ userA: userId }, { userB: userId }] });
    res.status(200).json(
      streaks.map((streak) => ({
        peerId: String(streak.userA) === String(userId) ? streak.userB : streak.userA,
        ...toStreakSummary(streak),
      })),
    );
  } catch (error) {
    console.error("Error in getStreaks:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { replyToId, sticker } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;
    let audioUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res
          .status(500)
          .json({ message: "Media upload is not configured" });
      }

      let url;
      try {
        url = await uploadChatMedia(req.file);
      } catch (error) {
        console.error("Error uploading chat media to ImageKit:", error);
        return res.status(502).json({
          message: "ImageKit could not store this file. Check its credentials and upload limits.",
        });
      }
      if (req.file.mimetype.startsWith("audio/")) audioUrl = url;
      else if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    let replyTo;
    if (replyToId) {
      const repliedMessage = await Message.findOne({
        _id: replyToId,
        groupId: null,
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      }).populate("senderId", "fullName");
      if (!repliedMessage) return res.status(400).json({ message: "That message cannot be replied to" });
      replyTo = {
        messageId: repliedMessage._id,
        senderId: repliedMessage.senderId._id,
        senderName: repliedMessage.senderId.fullName,
        text: repliedMessage.text || "",
        mediaType: repliedMessage.image ? "image" : repliedMessage.video ? "video" : repliedMessage.sticker ? "sticker" : "text",
      };
    }
    if (!text?.trim() && !imageUrl && !videoUrl && !audioUrl && !sticker) {
      return res.status(400).json({ message: "Write a message or choose a sticker" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text?.trim(),
      image: imageUrl,
      video: videoUrl,
      audio: audioUrl,
      sticker,
      replyTo,
    });

    await newMessage.save();

    if (imageUrl || videoUrl) await recordImageStreak(senderId, receiverId);

    // The user room delivers to every active tab/device for this recipient.
    io.to(`user:${receiverId}`).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function toggleMessageReaction(req, res) {
  try {
    const { emoji } = req.body;
    if (typeof emoji !== "string" || !emoji.trim() || [...emoji].length > 8) {
      return res.status(400).json({ message: "Choose a valid emoji" });
    }
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.groupId) {
      const { default: Group } = await import("../models/group.model.js");
      const member = await Group.exists({ _id: message.groupId, members: req.user._id });
      if (!member) return res.status(403).json({ message: "You are not a member of this group" });
    } else if (
      String(message.senderId) !== String(req.user._id) &&
      String(message.receiverId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "You cannot react to this message" });
    }

    const userId = String(req.user._id);
    const existing = message.reactions.find((reaction) => String(reaction.userId) === userId);
    if (existing?.emoji === emoji) {
      message.reactions = message.reactions.filter((reaction) => String(reaction.userId) !== userId);
    } else if (existing) {
      existing.emoji = emoji;
    } else {
      message.reactions.push({ userId: req.user._id, emoji });
    }
    await message.save();
    const updated = await Message.findById(message._id).populate("senderId", "fullName profilePic");
    if (message.groupId) io.to(`group:${message.groupId}`).emit("messageUpdated", updated);
    else {
      io.to(`user:${message.senderId}`).emit("messageUpdated", updated);
      io.to(`user:${message.receiverId}`).emit("messageUpdated", updated);
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error reacting to message:", error);
    res.status(500).json({ message: "Could not update reaction" });
  }
}

export async function setMessagePin(req, res) {
  try {
    const { pinned } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message || message.kind !== "message") return res.status(404).json({ message: "Message not found" });
    const userId = String(req.user._id);
    if (![String(message.senderId), String(message.receiverId)].includes(userId)) return res.status(403).json({ message: "You cannot pin this message" });
    const isPinned = message.pinnedBy.some((pin) => String(pin.userId) === userId);
    if (pinned && !isPinned) {
      const peerId = String(message.senderId) === userId ? message.receiverId : message.senderId;
      const count = await Message.countDocuments({ groupId: null, $or: [{ senderId: req.user._id, receiverId: peerId }, { senderId: peerId, receiverId: req.user._id }], "pinnedBy.userId": req.user._id });
      if (count >= 5) return res.status(409).json({ message: "You can pin up to 5 messages per chat. Unpin one to continue." });
      message.pinnedBy.push({ userId: req.user._id, pinnedAt: new Date() });
    } else if (!pinned && isPinned) {
      message.pinnedBy = message.pinnedBy.filter((pin) => String(pin.userId) !== userId);
    }
    await message.save();
    const updated = await Message.findById(message._id).populate("senderId", "fullName profilePic");
    io.to(`user:${message.senderId}`).emit("messageUpdated", updated);
    io.to(`user:${message.receiverId}`).emit("messageUpdated", updated);
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error pinning message:", error);
    res.status(500).json({ message: "Could not update pinned message" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const scope = req.body.scope === "everyone" ? "everyone" : "me";
    const message = await Message.findById(id);
    if (!message || message.kind === "streak-notice") return res.status(404).json({ message: "Message not found" });
    const userId = String(req.user._id);
    if (![String(message.senderId), String(message.receiverId)].includes(userId)) return res.status(403).json({ message: "You cannot delete this message" });
    if (scope === "everyone") {
      if (String(message.senderId) !== userId) return res.status(403).json({ message: "Only the sender can delete for everyone" });
      await message.deleteOne();
      io.to(`user:${message.senderId}`).emit("messageDeleted", { messageId: id });
      io.to(`user:${message.receiverId}`).emit("messageDeleted", { messageId: id });
    } else {
      message.deletedFor = [...new Set([...(message.deletedFor || []).map(String), userId])];
      await message.save();
      io.to(`user:${userId}`).emit("messageDeleted", { messageId: id });
    }
    res.status(200).json({ messageId: id, scope });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Could not delete message" });
  }
}

export async function setContactTag(req, res) {
  const peerId = String(req.params.peerId);
  const tag = typeof req.body.tag === "string" ? req.body.tag.trim().slice(0, 40) : "";
  if (!await User.exists({ _id: peerId })) return res.status(404).json({ message: "User not found" });
  const update = tag ? { $set: { [`contactTags.${peerId}`]: tag } } : { $unset: { [`contactTags.${peerId}`]: 1 } };
  await User.updateOne({ _id: req.user._id }, update);
  res.status(200).json({ peerId, tag });
}

export async function setOnlineStatusVisibility(req, res) {
  const enabled = Boolean(req.body.enabled);
  await User.updateOne({ _id: req.user._id }, { $set: { showOnlineStatus: enabled } });
  io.emit("presenceVisibilityChanged", { userId: String(req.user._id), enabled });
  res.status(200).json({ showOnlineStatus: enabled });
}
