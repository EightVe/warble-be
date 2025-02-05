import express from 'express';
import {createGuest, deleteGuest} from '../controllers/guest.controller.js';
const router = express.Router();


router.post('/create', createGuest);
router.post('/delete', deleteGuest);


export default router;