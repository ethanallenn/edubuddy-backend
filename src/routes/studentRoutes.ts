import { Router } from 'express';
import { batchIngestStudents, getImportHistory } from '../controllers/studentController.js';
import { protectRoute } from '../middleware/authHandler.js'; // Ensure they have a valid session JWT token

const router = Router();
router.post('/batch-ingest', protectRoute, batchIngestStudents);
router.get('/imports/history', protectRoute, getImportHistory);

export default router;