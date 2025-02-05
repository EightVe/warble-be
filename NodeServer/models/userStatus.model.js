import mongoose from "mongoose";

const userStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  socketId: { type: String, required: true },
  status: { type: String, enum: ["online", "away", "offline"], default: "offline" },
}, { timestamps: true });

const UserStatus = mongoose.model("UserStatus", userStatusSchema);
export { UserStatus };
