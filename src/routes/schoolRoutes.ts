import { Router } from 'express';
import { getAllSchools, createSchool } from '../controllers/schoolController';

const router = Router();

// GET /api/v1/schools - Fetch all registered schools
router.get('/', getAllSchools);

// POST /api/v1/schools - Register a new school
router.post('/', createSchool);

export default router;