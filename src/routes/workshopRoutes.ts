import { Router } from 'express';
import { getWorkshops, createWorkshop } from '../controllers/workshopController';

const router = Router();

router.get('/', getWorkshops);
router.post('/', createWorkshop);

export default router;
