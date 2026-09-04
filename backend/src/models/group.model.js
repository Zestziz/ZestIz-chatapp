import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    profilePic: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Group", groupSchema);