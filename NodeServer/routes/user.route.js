import express from 'express';
import { editAccount, editProfile,enableTwoFac ,disableTwoFac,userFinishedSteps,deleteAccount,getUserByUsername,GetBanInfo,appealBan,getPreviousBans,addUserAge,addUserGender,addUserCountry,submitFeedback} from '../controllers/user.controller.js';
import { authenticateToken } from '../utils/verifyUser.js';
const router = express.Router();

router.post('/edit-profile', authenticateToken, editProfile);
router.post('/edit-account', authenticateToken, editAccount);
router.post('/enable-twofac', authenticateToken, enableTwoFac);
router.post('/disable-twofac', authenticateToken, disableTwoFac);
router.post('/delete-account', authenticateToken, deleteAccount);
router.get('/user-id', getUserByUsername);
router.get('/ban-info/:id',authenticateToken, GetBanInfo);
router.put('/appeal-ban/:id',authenticateToken, appealBan);
router.get('/previous-bans/:id', authenticateToken, getPreviousBans);
router.post('/add-age/:id', authenticateToken, addUserAge);
router.post('/finished-steps/:id', authenticateToken, userFinishedSteps);
router.post('/add-gender/:id', authenticateToken, addUserGender);
router.post('/add-country/:id', authenticateToken, addUserCountry);
router.post("/submit-feedback",authenticateToken, submitFeedback);
export default router;
