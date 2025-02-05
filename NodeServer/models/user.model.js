import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
      },
      bio: {
        type: String,
      },
    password: {
      type: String,
      required: true,
    },
    verifiedEmail: {
        type: Boolean,
        default : false,
      },
      isAdmin: {
        type: Boolean,
        default : false,
      },
      twoFactorEnabled : {
        type: Boolean,
        default : false,
      },
    avatar:{
      type: String,
      default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    },
    refreshToken: { type: String },
    ip: {
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
    country_name: {
      type: String,
    },
    network: {
      type: String,
    },
    country_capital: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
