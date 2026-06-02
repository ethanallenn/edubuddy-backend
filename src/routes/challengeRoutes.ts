import { Router } from 'express';
import { getChallengesByNode, createChallenge, startForgeSession, submitForgeSession } from '../controllers/challengeController';

const router = Router();

// Challenge management
router.get('/node/:nodeId', getChallengesByNode);
router.post('/', createChallenge);

// Interactive Forge Sessions
router.post('/session/start', startForgeSession);
router.put('/session/:sessionId/submit', submitForgeSession);

export default router;