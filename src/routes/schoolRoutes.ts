import { Router } from 'express';
import { getSchools, createSchool } from '../controllers/schoolController';

const router = Router();

router.get('/', getSchools);
router.post('/', createSchool);

export default router;
