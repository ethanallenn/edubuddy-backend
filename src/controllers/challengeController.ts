import { Request, Response } from 'express';
import { pool } from '../app';

export const getChallengesByNode = async (req: Request, res: Response): Promise<void> => {
  const { nodeId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM challenges WHERE node_id = $1', [nodeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Server error while fetching challenges' });
  }
};

export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  const { node_id, forge_type, title, prompt, initial_state, validation_logic } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO challenges (node_id, forge_type, title, prompt, initial_state, validation_logic)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [node_id, forge_type, title, prompt, initial_state, validation_logic]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Server error while creating challenge' });
  }
};

// Interactive Forge Sessions
export const startForgeSession = async (req: Request, res: Response): Promise<void> => {
  const { student_id, challenge_id } = req.body;

  try {
    // Fetch the initial state from the challenge to populate the student's workspace
    const challengeRes = await pool.query('SELECT initial_state FROM challenges WHERE id = $1', [challenge_id]);
    if (challengeRes.rows.length === 0) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }
    const initialState = challengeRes.rows[0].initial_state;

    const result = await pool.query(
      'INSERT INTO forge_sessions (student_id, challenge_id, current_state) VALUES ($1, $2, $3) RETURNING *',
      [student_id, challenge_id, initialState]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error starting forge session:', error);
    res.status(500).json({ error: 'Server error while starting forge session' });
  }
};

export const submitForgeSession = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const { current_state, is_completed } = req.body;

  try {
    const result = await pool.query(
      `UPDATE forge_sessions 
       SET current_state = $1, is_completed = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [current_state, is_completed || false, sessionId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Forge session not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting forge session:', error);
    res.status(500).json({ error: 'Server error while submitting forge session' });
  }
};
