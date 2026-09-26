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
    showOnlineStatus: { type: Boolean, default: true },
}, 
  {timestamps: true} //createdAt or updatedAt
);

const User = mongoose.model("User",userSchema)

export default User;
