import { Router } from 'express';
import { createBatchInvitations } from '../controllers/inviteController.js';

const router = Router();
router.post('/batch', createBatchInvitations);

export default router;