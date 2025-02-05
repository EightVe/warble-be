import express from 'express';
import { signup, login,refreshToken,getUserInfo, logout,defaultLocationDetection,verifyOtp,getUserByEmail} from '../controllers/auth.controller.js';
import { authenticateToken } from '../utils/verifyUser.js';
const router = express.Router();


router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/user-info', authenticateToken, getUserInfo);
router.post('/geolocation', defaultLocationDetection)
router.post('/verify-otp', verifyOtp);
router.post('/user-by-email', getUserByEmail);
export default router;