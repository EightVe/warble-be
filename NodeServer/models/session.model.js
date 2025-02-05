import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    ip: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    org: {
      type: String,
    },
    postal: {
      type: String,
    },
    version: {
      type: String,
    },
    network: {
      type: String,
    },
    country_capital: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
