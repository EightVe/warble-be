import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reportedByWho: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  screenshot: { type: String, required: false },
  severity: { type: String, enum: ["high", "medium", "low"], required: true }, // Fixed typo from "sevirity"
  type: { type: String, enum: ["videosession", "posting", "comment", "reply"], required: true },
  reportId: { type: String, required: true, unique: true },
  isRead: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Report = mongoose.model("Report", ReportSchema);