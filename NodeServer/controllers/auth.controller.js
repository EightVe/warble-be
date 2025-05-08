import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';
import bcryptjs from "bcryptjs";
import Session from "../models/session.model.js";
import OTP  from "../models/otp.model.js";
import nodemailer from 'nodemailer';
import { UAParser } from 'ua-parser-js';



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
const generate2FAEmailVerifTemplate = (otp) => {
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
              2FA Verification
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
             To verify your two factor authentication please enter the OTP-Code bellow.
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
export const sendOtpCode = async (user) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const emailTemplate = generate2FAEmailVerifTemplate(otp);
  const mailOptions = {
    from: "no-reply@warble.chat",
    to: user.emailAddress,
    subject: 'Warble - 2FA OTP Code',
    html: emailTemplate,
  };

  await transporter.sendMail(mailOptions);

  const newOtp = new OTP({
    userId: user._id,
    otp,
  });

  await newOtp.save();
};
export const verifyToken = async (req, res) => {
  const { accessToken } = req.cookies;
  
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized', authenticated: false });
  }

  try {
    // Verify the access token
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    
    // If verification succeeds, return success
    return res.status(200).json({ 
      message: 'Token is valid', 
      authenticated: true,
      userId: decoded.id
    });
  } catch (error) {
    // If access token is expired or invalid, check refresh token
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Unauthorized', authenticated: false });
    }
    
    try {
      // Verify the refresh token without creating new tokens
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: 'Forbidden', authenticated: false });
      }
      
      // Refresh token is valid, but we don't refresh the tokens here
      // Just indicate that authentication is valid but needs refresh
      return res.status(200).json({ 
        message: 'Access token expired but refresh token valid', 
        authenticated: true,
        needsRefresh: true,
        userId: decoded.id
      });
    } catch (refreshError) {
      return res.status(403).json({ message: 'Invalid refresh token', authenticated: false });
    }
  }
};
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const signup = async (req, res, next) => {
  const { username, firstName, lastName, emailAddress, password } = req.body;
  if (!firstName || !lastName || !emailAddress || !password) {
    console.log("400 Bad Request:", req.body); // Log the request body
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, firstName, lastName, emailAddress, password: hashedPassword});

  try {
    await newUser.save();
    res.status(201).json('User created successfully!');
  } catch (error) {
    console.log(error);
  }
};

export const login = async (req, res, next) => {
  const { emailAddress, password } = req.body;

  try {
    const user = await User.findOne({ emailAddress });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordCorrect = await bcryptjs.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const parser = new UAParser(req.headers['user-agent']);
    const browserName = parser.getBrowser().name; // e.g., "Chrome", "Opera"
    const osName = parser.getOS().name;           // e.g., "Windows", "Mac OS", "iOS"
    const deviceType = parser.getDevice().type;   // e.g., "mobile", "tablet", undefined

    const userAgentInfo = `${browserName} on ${osName}${deviceType ? ' (' + deviceType + ')' : ''}`;
    if (user.twoFactorEnabled) {
      await sendOtpCode(user);
      return res.status(200).json({ message: 'OTP sent to your email', twoFactorEnabled: true });
    } else {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      await Session.updateMany({ userId: user._id, isCurrent: true }, { isCurrent: false });

      const newSession = new Session({
        userId: user._id,
        ip: user.ip,
        city: user.city,
        country: user.country,
        org: user.org,
        postal: user.postal,
        version: user.version,
        network: user.network,
        country_capital: user.country_capital,
        userAgent: userAgentInfo, 
        isCurrent: true,
      });

      await newSession.save();

      res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 5 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      // res.cookie('accessToken', accessToken, {
      //   httpOnly: true,
      //   maxAge: 5 * 60 * 1000,
      //   domain: '.warble.chat', // allows sharing across all subdomains
      //   secure: true,            // send only over HTTPS
      //   sameSite: 'Lax'          // or 'None' + secure=true if you support cross-origin
      // });
      // res.cookie('refreshToken', refreshToken, {
      //   httpOnly: true,
      //   maxAge: 7 * 24 * 60 * 60 * 1000,
      //   domain: '.warble.chat',
      //   secure: true,
      //   sameSite: 'Lax'
      // });
      
      res.status(200).json({ message: 'Logged in successfully', token: accessToken, refreshToken, user });
    }
  } catch (error) {
    console.error('Error during login process:', error);
    next(error);
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) return res.status(403).json({ message: 'Forbidden' });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('accessToken', newAccessToken, { httpOnly: true, maxAge: 5 * 60 * 1000 }); // 2 minutes
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
    // res.cookie('accessToken', accessToken, {
    //   httpOnly: true,
    //   maxAge: 5 * 60 * 1000,
    //   domain: '.warble.chat', // allows sharing across all subdomains
    //   secure: true,            // send only over HTTPS
    //   sameSite: 'Lax'          // or 'None' + secure=true if you support cross-origin
    // });
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    //   domain: '.warble.chat',
    //   secure: true,
    //   sameSite: 'Lax'
    // });
    
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getUserInfo = async (req, res, next) => {
  const { id } = req.user;

  try {
    const user = await User.findById(id).select('-password -refreshToken');
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out successfully' });
};


export const defaultLocationDetection = async (req, res, next) => {
  const {
    userId,
    city,
    country_name,
    ip,
    org,
    postal,
    version,
    network,
    country_capital
  } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found.');
      return res.status(404).json({ message: 'User not found' });
    }

    let changes = [];

    // ✅ Only update country if user.country is null/empty/undefined
    if (!user.country && country_name) {
      changes.push(`Country set to ${country_name}`);
      user.country = country_name;
    }

    if (user.city !== city) {
      changes.push(`City changed from ${user.city} to ${city}`);
      user.city = city;
    }

    if (user.ip !== ip) {
      changes.push(`IP changed from ${user.ip} to ${ip}`);
      user.ip = ip;
    }

    if (user.org !== org) {
      changes.push(`Org changed from ${user.org} to ${org}`);
      user.org = org;
    }

    if (user.postal !== postal) {
      changes.push(`Postal changed from ${user.postal} to ${postal}`);
      user.postal = postal;
    }

    if (user.version !== version) {
      changes.push(`Version changed from ${user.version} to ${version}`);
      user.version = version;
    }

    if (user.network !== network) {
      changes.push(`Network changed from ${user.network} to ${network}`);
      user.network = network;
    }

    if (user.country_capital !== country_capital) {
      changes.push(`Country capital changed from ${user.country_capital} to ${country_capital}`);
      user.country_capital = country_capital;
    }

    if (changes.length === 0) {
      console.log("User info didn't change, no need to save.");
      return res.json({ message: "User info didn't change, no update needed." });
    }

    console.log('User info changed. Updating the following fields:');
    changes.forEach(change => console.log(change));

    await user.save();
    res.json({ message: 'Geolocation updated successfully', changes });

  } catch (err) {
    console.error('Error saving geolocation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};




export const verifyOtp = async (req, res, next) => {
  const { userId, otp } = req.body;

  try {
    console.log('Request body:', req.body); // Log the request body
    console.log(`Verifying OTP for userId: ${userId} with otp: ${otp}`);

    // Retrieve the latest OTP for the user
    const otpRecord = await OTP.findOne({ userId }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.log('No OTP record found');
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    console.log(`Retrieved OTP from database: ${otpRecord.otp}`);

    // Compare the OTPs as strings
    if (otpRecord.otp !== otp) {
      console.log(`OTP mismatch: expected ${otpRecord.otp}, got ${otp}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save the refresh token to the user
    user.refreshToken = refreshToken;
    await user.save();

    // Remove the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Set cookies for tokens
    res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 5 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    // res.cookie('accessToken', accessToken, {
    //   httpOnly: true,
    //   maxAge: 5 * 60 * 1000,
    //   domain: '.warble.chat', // allows sharing across all subdomains
    //   secure: true,            // send only over HTTPS
    //   sameSite: 'Lax'          // or 'None' + secure=true if you support cross-origin
    // });
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    //   domain: '.warble.chat',
    //   secure: true,
    //   sameSite: 'Lax'
    // });
    
    // Respond with success
    res.status(200).json({ message: 'OTP verified successfully', token: accessToken, refreshToken, user });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    next(error);
  }
};

export const getUserByEmail = async (req, res, next) => {
  const { emailAddress } = req.body;

  try {
    const user = await User.findOne({ emailAddress });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ userId: user._id });
  } catch (error) {
    next(error);
  }
};
