import { Router } from 'express';
import { getStudentMastery, getCohortMastery, updateMasteryStatus } from '../controllers/masteryController';

const router = Router();

// Fetch mastery for an individual student across the graph
router.get('/student/:studentId', getStudentMastery);
// Fetch mastery for an entire cohort (Powers the Teacher Heat Map)
router.get('/cohort/:cohortId', getCohortMastery);
router.put('/update', updateMasteryStatus);

export default router;