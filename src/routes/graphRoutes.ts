import { Router } from 'express';
import { getSkillGraph, createSkillNode, addSkillEdge } from '../controllers/graphController';

const router = Router();

router.get('/', getSkillGraph);
router.post('/nodes', createSkillNode);
router.post('/edges', addSkillEdge);

export default router;
