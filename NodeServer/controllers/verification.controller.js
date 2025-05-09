// controllers/verification.controller.js
import nodemailer from 'nodemailer';
import OTP from '../models/otp.model.js';
import User from '../models/user.model.js';
import crypto from 'crypto';
import bcryptjs from "bcryptjs";

// Configure Nodemailer
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

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const generateEmailVerifTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    "
  >
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background:#ededed;
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      "
    >
      <header>
        <table style="width: 100%;">
          <tbody>
            <tr style="height: 0;">
              <td style="display:flex; justify-content: center; align-items: center;">
                <img
                  alt="warble_logo"
                  src="https://i.ibb.co/DgmQV8Q2/mainLogo.png"
                  height="40px"
                />
                <p style="font-size:16px; font-weight:500; color:#ff5757">Warble</p>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div
          style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          "
        >
          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1
              style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              "
            >
              Email Verification
            </h1>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              "
            >
            </p>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-weight: 400;
                letter-spacing: 0.56px;
              "
            >
             To verify your email please enter the OTP-Code bellow, this code will expire in
              <span style="font-weight: 600; color: #1f1f1f;">10 minutes</span>.
            </p>
            
          
          </div>
          <div style="padding-top : 20px;">
          <p
                          style="
                margin: 0;
                font-size: 25px;
                font-weight: 400;
                color : #ff5757;
                padding: 10px 20px;
                border-radius : 10px;
                margin-top:10px;
                text-decoration : none;
              ">${otp}</p>
          </div>
        </div>
      </main>

      <footer
        style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        "
      >
        <p style="margin: 0; margin-top: 16px; color: #434343;">
          Copyright © 2025 Eightve LTD. All rights reserved.
        </p>
        <p style="margin: 0; margin-top: 1px; color: #434343; font-size:11px">
              warble.chat is a trademark of Eightve LTD. All rights reserved. You may unsubscribe at any time.
          </p>
      </footer>
    </div>
  </body>
</html>
  

    
  `;
};
export const sendOTP = async (req, res) => {
  const { userId, email } = req.body;
  const otp = generateOTP();
  const emailTemplate = generateEmailVerifTemplate(otp);
  const mailOptions = {
    from: 'no-reply@warble.chat',
    to: email,
    subject: 'Warble - Email Verification OTP',
    html: emailTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);

    // Save OTP to database
    await OTP.create({ userId, otp });

    res.status(200).json({ message: 'OTP sent to email successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP.', error });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const otpRecord = await OTP.findOne({ userId, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Verify the user's email
    await User.findByIdAndUpdate(userId, { verifiedEmail: true });

    // Delete the OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP.', error });
  }
};



const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpiry = Date.now() + 3600000; // Token expires in one hour
  return { resetToken, resetTokenExpiry };
};
const generateResetEmailTemplate = (url) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    "
  >
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background:#ededed;
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      "
    >
      <header>
        <table style="width: 100%;">
          <tbody>
            <tr style="height: 0;">
              <td style="display:flex; justify-content: center; align-items: center;">
                <img
                  alt="warble_logo"
                  src="https://i.ibb.co/DgmQV8Q2/mainLogo.png"
                  height="40px"
                />
                <p style="font-size:16px; font-weight:500; color:#ff5757">Warble</p>
              </td>
            </tr>
          </tbody>
        </table>
      </header>

      <main>
        <div
          style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          "
        >
          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1
              style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              "
            >
              Password Reset Request
            </h1>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              "
            >
            </p>
            <p
              style="
                margin: 0;
                margin-top: 17px;
                font-weight: 400;
                letter-spacing: 0.56px;
              "
            >
             To reset your password click on the button bellow, after that you can reset your password freely. This link will be expired after
              <span style="font-weight: 600; color: #1f1f1f;">1 hour</span>.
            </p>
            
          
          </div>
          <div style="padding-top : 20px;">
          <a href="${url}" target="_blank" 
                          style="
                margin: 0;
                font-size: 14px;
                font-weight: 400;
                background-color: #ff5757;
                color : #fff;
                padding: 10px 20px;
                border-radius : 10px;
                margin-top:10px;
                text-decoration : none;
              ">Reset Password</a>
          </div>
        </div>
      </main>

      <footer
        style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        "
      >
        <p style="margin: 0; margin-top: 16px; color: #434343;">
          Copyright © 2025 Eightve LTD. All rights reserved.
        </p>
        <p style="margin: 0; margin-top: 1px; color: #434343; font-size:11px">
              warble.chat is a trademark of Eightve LTD. All rights reserved. You may unsubscribe at any time.
          </p>
      </footer>
    </div>
  </body>
</html>
  

    
  `;
};

export const forgotPassword = async (req, res) => {
  const { emailAddress } = req.body;

  try {
    const user = await User.findOne({ emailAddress });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { resetToken, resetTokenExpiry } = generatePasswordResetToken();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    const resetUrl = `${process.env.APP_ORIGIN}/reset-password/${resetToken}`; // Update for production
    const emailTemplate = generateResetEmailTemplate(resetUrl);

    await transporter.sendMail({
      from: 'no-reply@warble.chat',
      to: user.emailAddress,
      subject: 'Warble - Password Reset Request',
      html: emailTemplate,
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing password reset', error });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error });
  }
};