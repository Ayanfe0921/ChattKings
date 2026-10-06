import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
    clerkId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    profilePic: {
        type: String,
        default: "",
    },
    contactTags: { type: Map, of: String, default: {} },
    blockedUsers: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    showOnlineStatus: { type: Boolean, default: true },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, default: "" },
}, 
  {timestamps: true} //createdAt or updatedAt
);

const User = mongoose.model("User",userSchema)

export default User;
