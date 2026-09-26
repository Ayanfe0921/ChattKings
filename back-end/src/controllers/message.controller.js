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

  // Add each sender atomically so simultaneous uploads cannot overwrite one another.
  await Streak.findOneAndUpdate(
    { userA, userB },
    [
      {
        $set: {
          activeDaySenders: {
            $cond: [
              { $eq: ["$activeDayKey", today] },
              {
                $setUnion: [
                  { $ifNull: ["$activeDaySenders", []] },
                  [senderId],
                ],
              },
              [senderId],
            ],
          },
          activeDayKey: today,
        },
      },
    ],
    { new: true },
  );

  // Only one request can qualify a given day and create its milestone notice.
  const qualifiedStreak = await Streak.findOneAndUpdate(
    {
      userA,
      userB,
      activeDayKey: today,
      activeDaySenders: { $all: [userA, userB] },
      lastQualifiedDayKey: { $ne: today },
    },
    [
      {
        $set: {
          currentCount: {
            $cond: [
              { $eq: ["$lastQualifiedDayKey", yesterday] },
              { $add: [{ $ifNull: ["$currentCount", 0] }, 1] },
              1,
            ],
          },
          startedAt: {
            $cond: [
              { $eq: ["$lastQualifiedDayKey", yesterday] },
              "$startedAt",
              new Date(),
            ],
          },
          lastQualifiedDayKey: today,
        },
      },
    ],
    { new: true },
  );

  let noticeText = null;
  if (qualifiedStreak) {
    if (qualifiedStreak.currentCount === 1) {
      noticeText = "You started a photo streak with each other! 🔥";
    } else if (
      STREAK_MILESTONES.includes(qualifiedStreak.currentCount) &&
      !qualifiedStreak.reachedMilestones.includes(qualifiedStreak.currentCount)
    ) {
      const milestone = qualifiedStreak.currentCount;
      await Streak.updateOne({ _id: qualifiedStreak._id }, { $addToSet: { reachedMilestones: milestone } });
      noticeText =
        milestone === 5000
          ? "You reached the 5 decade photo streak milestone! 🎉"
          : `You reached the ${milestone}-day photo streak milestone! 🎉`;
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

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const conversations = await Message.aggregate([
      // 1. Keep only the messages I sent or received.
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // 2. Collapse them into one row per chat partner, noting our latest message time.
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
          lastMessageAt: { $max: "$createdAt" },
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
      { $replaceRoot: { newRoot: { $first: "$user" } } },
      // 6. Hide the private clerkId field from the result.
      { $project: { clerkId: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);
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
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
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
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res
          .status(500)
          .json({ message: "Media upload is not configured" });
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    if (imageUrl) await recordImageStreak(senderId, receiverId);

    // The user room delivers to every active tab/device for this recipient.
    io.to(`user:${receiverId}`).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
