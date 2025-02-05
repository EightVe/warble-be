import express from 'express';
import { addSession, deleteSession, getSessions } from '../controllers/session.controller.js';
import { authenticateToken } from '../utils/verifyUser.js';
const router = express.Router();

router.post('/add', authenticateToken, addSession);
router.post('/delete', authenticateToken, deleteSession);
router.get('/', authenticateToken, getSessions);

export default router;
