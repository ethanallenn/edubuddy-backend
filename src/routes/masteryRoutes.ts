import { Router } from 'express';
import { getStudentMastery, getCohortMastery, updateMasteryStatus } from '../controllers/masteryController';

const router = Router();

router.get('/student/:studentId', getStudentMastery);
router.get('/cohort/:cohortId', getCohortMastery);
router.post('/update', updateMasteryStatus);

export default router;