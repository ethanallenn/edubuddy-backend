import { Router } from 'express';
import { getTeacherDashboardData, getClassDashboardData, createClassAssignment } from '../controllers/dashboardController.js';
import { protectRoute } from '../middleware/authHandler.js';

const router = Router();
router.get('/summary', protectRoute, getTeacherDashboardData);
router.get('/classes/:classId', protectRoute, getClassDashboardData);
router.post('/classes/:classId/assignments', protectRoute, createClassAssignment);

export default router;