import { Router } from 'express';
import { getCohorts, createCohort } from '../controllers/cohortController';

const router = Router();

router.get('/', getCohorts);
router.post('/', createCohort);

export default router;
