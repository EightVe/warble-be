import express from 'express';
import { RecentFiveUsers,editUser,banUser,getUserById,getAllUsers,rejectAppeal,approveAppeal,getAllReports,getAllFeedbacks,getFeedbackById} from '../controllers/admin.controller.js';
import { authenticateToken,authorizeAdmin } from '../utils/verifyUser.js';
import { Log } from '../models/serverlog.model.js';
const router = express.Router();


router.get('/recent-five-users',authenticateToken,authorizeAdmin, RecentFiveUsers);
router.get('/all-users',authenticateToken,authorizeAdmin, getAllUsers);
router.put("/edit-user/:id",authenticateToken,authorizeAdmin, editUser)

// Ban/unban user route
router.put("/ban-user/:id",authenticateToken,authorizeAdmin, banUser)
router.get('/fetch-userbyid/:id',authenticateToken,authorizeAdmin, getUserById);
router.put("/appeal/:caseId/reject", authenticateToken, authorizeAdmin, rejectAppeal);
router.put("/appeal/:caseId/approve", authenticateToken, authorizeAdmin, approveAppeal);
router.get("/report/get-all", authenticateToken, authorizeAdmin, getAllReports);
router.get("/get-all-feedbacks",authenticateToken, authorizeAdmin, getAllFeedbacks);
router.get("/get-feedback/:id",authenticateToken, authorizeAdmin, getFeedbackById);

router.get("/logs", async (req, res) => {
    try {
      const { page = 1 } = req.query; // Get page from query params, default is 1
      const limit = 50;
      const skip = (page - 1) * limit;
  
      const logs = await Log.find()
        .sort({ timestamp: -1 }) // Show latest logs first
        .skip(skip)
        .limit(limit);
  
      const totalLogs = await Log.countDocuments();
  
      res.json({
        success: true,
        logs,
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: Number(page),
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ success: false, message: "Error fetching logs" });
    }
  });
export default router;