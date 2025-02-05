import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';
import bcryptjs from "bcryptjs";
import Session from "../models/session.model.js";
import OTP  from "../models/otp.model.js";
import nodemailer from 'nodemailer';
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

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const signup = async (req, res, next) => {
  const { username, firstName, lastName, emailAddress, password } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, firstName, lastName, emailAddress, password: hashedPassword });

  try {
    await newUser.save();
    res.status(201).json('User created successfully!');
  } catch (error) {
    next(error);
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
        userAgent: req.headers['user-agent'],
        isCurrent: true,
      });

      await newSession.save();

      res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 5 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

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
  const { userId, city, country_name, ip, org, postal, version, network, country_capital } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.city = city;
    user.country = country_name;
    user.ip = ip;
    user.org = org;
    user.postal = postal;
    user.version = version;
    user.network = network;
    user.country_capital = country_capital;

    await user.save();
    res.json({ message: 'Geolocation saved successfully' });
  } catch (err) {
    console.log('Error saving geolocation:', err);
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
