import { Router } from 'express';
import { getUsersBySchool, createUser, loginUser } from '../controllers/userController.js';

const router = Router();

// Standard CRUD endpoints
router.get('/:school_id', getUsersBySchool);
router.post('/', createUser);

// Auth Gateway Endpoint
router.post('/login', loginUser);

export default router;