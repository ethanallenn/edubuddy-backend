import express from 'express';
import { 
  createUser, 
  loginUser, 
  getUsersBySchool, 
  forgotPassword, 
  resetPassword 
} from '../controllers/userController.js';

const router = express.Router();

// Existing routes
router.post('/signup', createUser);
router.post('/login', loginUser);
router.get('/school/:school_id', getUsersBySchool);

// ---> The New Password Reset Routes <---
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;