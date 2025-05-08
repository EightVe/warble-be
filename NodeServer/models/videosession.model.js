import mongoose from "mongoose"

function generateSessionId() {
  // Generate a random 6-digit number
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  return `VS-${randomNum}`
}

const ActivityDuration = {
  openedAt: Date,
  closedAt: Date,
  durationSeconds: Number,
}

const NetworkQualityLog = {
  quality: {
    type: String,
    enum: ["offline", "unknown", "poor", "good", "excellent"],
  },
  timestamp: Date,
}

const ChatMessage = {
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: String,
  timestamp: Date,
}

const videoSessionSchema = new mongoose.Schema({
  sessionId: { type: String, default: generateSessionId, unique: true, index: true },
  participants: {
    user1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    user2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  isAdmin: {
    user1: { type: Boolean, default: false },
    user2: { type: Boolean, default: false },
    bothAreAdmins: { type: Boolean, default: false },
    anyIsAdmin: { type: Boolean, default: false },
  },
  filtersUsed: {
    user1: {
      gender: String,
      ageRange: [Number],
      country: String,
    },
    user2: {
      gender: String,
      ageRange: [Number],
      country: String,
    },
  },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date }, // fill this when session ends
  durationSeconds: Number, // auto-calculate on save
  chat: [ChatMessage],
  networkQuality: {
    user1: [NetworkQualityLog],
    user2: [NetworkQualityLog],
  },
  micActivity: {
    user1: [ActivityDuration],
    user2: [ActivityDuration],
  },
  cameraActivity: {
    user1: [ActivityDuration],
    user2: [ActivityDuration],
  },
  termination: {
    reason: {
      type: String,
      enum: ["disconnect", "skip", "error", "timeout", "unknown"],
      default: "unknown",
    },
    errorMessage: String,
  },
})

const VideoSession = mongoose.model("VideoSession", videoSessionSchema)

export default VideoSession
