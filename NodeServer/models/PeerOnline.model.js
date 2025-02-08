import mongoose from "mongoose";

const PeerOnlineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  socketId: { type: String, required: true, unique: true },
  status: { type: String, enum: ["online", "away", "offline"], default: "online" },
  previousMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ✅ Store last matches
  createdAt: { type: Date, default: Date.now },
});

export const PeerOnline = mongoose.model("PeerOnline", PeerOnlineSchema);
