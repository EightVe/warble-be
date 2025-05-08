import express from 'express';
import { GetMyReportInfo,GetAllMyReports,SubmitReport } from '../controllers/report.controller.js';
import { authenticateToken } from '../utils/verifyUser.js';
const router = express.Router();


router.get('/get-report-info/:reportId/:userId',authenticateToken, GetMyReportInfo);
router.get('/get-all-reports/:userId',authenticateToken, GetAllMyReports);
router.post('/submit-report',authenticateToken, SubmitReport);
export default router;