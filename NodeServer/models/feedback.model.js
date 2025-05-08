import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
    submittedBy : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true },
  additionalInformation: { type: String, required: false },
  type: { type: String, enum: ["videomatch", "live", "posts"], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Feedback = mongoose.model("Feedback", FeedbackSchema);