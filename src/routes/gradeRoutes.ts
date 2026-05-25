import { Router } from 'express';
import { getStudentReportCard, createGradeRecord, getSubjectPerformanceMetrics } from '../controllers/gradeController.js';
import { protectRoute } from '../middleware/authHandler.js'; // 1. Import the gatekeeper shield

const router = Router();

// 2. Apply the guard to the entire router module. 
// Every endpoint listed below this line now requires a valid token!
router.use(protectRoute);

// Secure Analytics & CRUD Endpoints
router.get('/student/:student_id', getStudentReportCard);
router.get('/subject/:subject_id', getSubjectPerformanceMetrics);
router.post('/', createGradeRecord);

export default router;