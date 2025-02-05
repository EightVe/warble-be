// models/otpModel.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 10 minutes
    },
  },
  { timestamps: true }
);

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
