import { Router } from 'express';
import { getSubjectsBySchool, createSubject } from '../controllers/subjectController';

const router = Router();

router.get('/:school_id', getSubjectsBySchool);
router.post('/', createSubject);

export default router;