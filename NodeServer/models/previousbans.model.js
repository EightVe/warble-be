import mongoose from "mongoose";

const PreviousBansSchema = new mongoose.Schema({
  bannedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bannedByWho: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caseId: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  expiryDate: { type: Date, default: null }, // Null for permanent bans
  banDate: { type: Date, default: Date.now },
  appealStatus: { type: String, enum: ["pending", "rejected", "approved",'none'], default: "none" },
  appealExplanation: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const PreviousBan = mongoose.model("PreviousBan", PreviousBansSchema);
