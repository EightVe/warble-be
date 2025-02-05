import nodemailer from 'nodemailer';
import OTP from '../models/otp.model.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vexobyte8@gmail.com',
    pass: 'sqzfncwlgczighgv',
  },
  tls: {
    rejectUnauthorized: false, // Add this line
  },
});

export const sendOtpCode = async (user) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

  const mailOptions = {
    from: "vexobyte8@gmail.com",
    to: user.emailAddress,
    subject: 'Your OTP Code',
    text: `Your TwoFac OTP code is ${otp}`,
  };

  await transporter.sendMail(mailOptions);

  const newOtp = new OTP({
    userId: user._id,
    otp,
  });

  await newOtp.save();
};
