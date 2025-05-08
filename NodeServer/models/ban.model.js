import mongoose from "mongoose";
import { io } from "../index.js";
import User from "./user.model.js";
import { PreviousBan } from "./previousbans.model.js";

const BanSchema = new mongoose.Schema({
  bannedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bannedByWho: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caseId: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  expiryDate: { type: Date, default: null }, // Null for permanent bans
  banDate: { type: Date, default: Date.now },
  appealStatus: { type: String, enum: ["pending", "rejected", "approved", "none"], default: "none" },
  appealExplanation: { type: String, default: "" },
  isBanned: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-unban when expiry date is reached
BanSchema.post("save", function (doc) {
  if (doc.expiryDate) {
    const now = new Date();
    const timeUntilUnban = doc.expiryDate - now;

    if (timeUntilUnban > 0) {
      setTimeout(async () => {
        try {
          const banRecord = await mongoose.model("Ban").findById(doc._id);

          if (!banRecord) return;

          // **Save Expired Ban to PreviousBan Before Deleting**
          await PreviousBan.create({
            bannedUser: banRecord.bannedUser,
            bannedByWho: banRecord.bannedByWho,
            caseId: banRecord.caseId,
            reason: banRecord.reason,
            expiryDate: banRecord.expiryDate,
            banDate: banRecord.banDate,
            appealStatus: banRecord.appealStatus,
            appealExplanation: banRecord.appealExplanation
          });

          console.log(`Ban moved to PreviousBan for user: ${banRecord.bannedUser}`);

          // Remove the ban from active bans
          await mongoose.model("Ban").deleteOne({ _id: banRecord._id });

          // Update user status
          await User.findByIdAndUpdate(banRecord.bannedUser, { isBanned: false });

          console.log(`User ${banRecord.bannedUser} automatically unbanned.`);

          // Emit event to inform all connected clients
          io.emit("banStatusUpdated", { userId: banRecord.bannedUser, isBanned: false });

        } catch (error) {
          console.error("Error auto-unbanning user:", error);
        }
      }, timeUntilUnban);
    }
  }
});

export const Ban = mongoose.model("Ban", BanSchema);
