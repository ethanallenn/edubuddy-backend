import { Router } from 'express';
import { getTeacherDashboardData } from '../controllers/dashboardController.js';
import { protectRoute } from '../middleware/authHandler.js';

const router = Router();
router.get('/summary', protectRoute, getTeacherDashboardData);

export default router;