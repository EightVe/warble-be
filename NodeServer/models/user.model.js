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
      userAge: { 
        type: Number, 
        required: false,
      },
      userBirthDay: { 
        type: String, 
        required: false, 
      },
      userBirthMonth: { 
        type: String, 
        required: false, 
      },
      userBirthYear: { 
        type: String, 
        required: false, 
      },
      userFullBirthday: { 
        type: String, 
        required: false, 
      },
      gender: {
        type: String,
        enum: ['male', 'female'],
        required: false,
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
      isFinishedSteps: {
        type: Boolean,
        default : false,
      },
      isBanned: {
        type: Boolean,
        default : false,
      },
      twoFactorEnabled : {
        type: Boolean,
        default : false,
      },
      accountHealth :{
        type: Number,
        default : 100,
      },
      isUserFirstStepsCompleted : {
        type: Boolean,
        default : false,
      },
      lastTimePasswordEdited: {
        type: Date,
        default: null,
      },
      isVerified : {
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
