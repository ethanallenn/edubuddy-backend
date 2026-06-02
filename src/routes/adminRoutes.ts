import { Router } from 'express';
import { protectRoute } from '../middleware/authHandler.js';
import { getAdminActivities } from '../controllers/adminController.js';
import { createBatchInvitations } from '../controllers/inviteController.js';

const router = Router();

router.get('/activities', protectRoute, getAdminActivities);
router.post('/invites/batch', protectRoute, createBatchInvitations);

export default router;