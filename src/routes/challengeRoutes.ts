import { Router } from 'express';
import { getChallengesByNode, createChallenge, startForgeSession, submitForgeSession } from '../controllers/challengeController';

const router = Router();

router.get('/node/:nodeId', getChallengesByNode);
router.post('/', createChallenge);
router.post('/forge/start', startForgeSession);
router.post('/forge/submit/:sessionId', submitForgeSession);

export default router;