import { Router } from 'express';
import { getAllSchools, createSchool, searchSchools } from '../controllers/schoolController.js'; // Added .js extension just in case your ES module setup requires it

const router = Router();

// GET /api/v1/schools - Fetch all registered schools
router.get('/', getAllSchools);

// POST /api/v1/schools - Register a new school
router.post('/', createSchool);

// GET /api/v1/schools/search - Search schools
router.get('/search', searchSchools); // FIXED: Removed the extra /schools/

export default router;