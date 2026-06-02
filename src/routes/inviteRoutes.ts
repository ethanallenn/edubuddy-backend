import { Router } from 'express';
import { createBatchInvitations, getInviteHistory } from '../controllers/inviteController.js';
import { protectRoute } from '../middleware/authHandler.js';

const router = Router();
router.post('/batch', createBatchInvitations);
router.get('/history', protectRoute, getInviteHistory);

export default router;