import mongoose from "mongoose";

const UserLogsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  otherUsedId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export const UserLogs = mongoose.model("UserLogs", UserLogsSchema);