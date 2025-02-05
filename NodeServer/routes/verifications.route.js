
import express from 'express';
import { sendOTP, verifyOTP,forgotPassword,resetPassword } from '../controllers/verification.controller.js';

const router = express.Router();

router.post('/send-email-otp', sendOTP);
router.post('/verify-email-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
export default router;
