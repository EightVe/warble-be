import express from 'express';
import { authenticateToken, authorizeAdmin } from '../utils/verifyUser.js';

const router = express.Router();

router.get('/settings', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Welcome to settings' });
});

router.get('/dashboard', authenticateToken, authorizeAdmin, (req, res) => {
  res.status(200).json({ message: 'Welcome to admin dashboard' });
});

export default router;
