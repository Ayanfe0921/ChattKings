import { clerkClient } from "@clerk/express";
import User from "../models/user.model.js";
import { io } from "../lib/socket.js";

async function refreshClerkProfile(user) {
  const clerkUser = await clerkClient.users.getUser(user.clerkId);
  const email = clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || email?.split("@")[0] || user.fullName;
  const changed = user.fullName !== fullName || user.profilePic !== (clerkUser.imageUrl || "") || (email && user.email !== email);
  if (!changed) return user;
  const updates = { fullName, profilePic: clerkUser.imageUrl || "" };
  if (email) updates.email = email;
  const updated = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
  io.emit("userUpdated", { _id: String(updated._id), fullName: updated.fullName, profilePic: updated.profilePic, email: updated.email });
  return updated;
}

export async function checkAuth(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unathorized" });
  try {
    req.user = await refreshClerkProfile(req.user);
  } catch (error) {
    console.error("Could not refresh Clerk profile:", error.message);
  }
  res.status(200).json(req.user);
}

export async function syncProfile(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unathorized" });
  try {
    const user = await refreshClerkProfile(req.user);
    res.status(200).json(user);
  } catch (error) {
    console.error("Could not sync Clerk profile:", error.message);
    res.status(502).json({ message: "Could not sync profile" });
  }
}
