import mongoose from "mongoose";

const DashboardAlertsSchema = new mongoose.Schema({
  bannedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bannedByWho: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caseId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const DashboardAlerts = mongoose.model("DashboardAlerts", DashboardAlertsSchema);