import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  level: { type: String, enum: ["log", "error", "warn", "info"], required: true },
  message: String,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed, // Store additional data if needed
});

export const Log = mongoose.model("Log", logSchema);
