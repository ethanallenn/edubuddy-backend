import { Request, Response } from 'express';
import { pool } from '../app';

export const getStudentMastery = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  try {
    const result = await pool.query(
      'SELECT node_id, status, last_activity_at FROM student_mastery WHERE student_id = $1',
      [studentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student mastery:', error);
    res.status(500).json({ error: 'Server error while fetching student mastery' });
  }
};

export const getCohortMastery = async (req: Request, res: Response): Promise<void> => {
  const { cohortId } = req.params;
  try {
    // This query gets the whole cohort's progress across the graph. Perfect for a Heat Map.
    const result = await pool.query(`
      SELECT sm.student_id, sm.node_id, sm.status, sm.last_activity_at, u.name as student_name
      FROM student_mastery sm
      JOIN cohort_members cm ON sm.student_id = cm.student_id
      JOIN users u ON sm.student_id = u.id
      WHERE cm.cohort_id = $1
    `, [cohortId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cohort mastery:', error);
    res.status(500).json({ error: 'Server error while fetching cohort mastery' });
  }
};

export const updateMasteryStatus = async (req: Request, res: Response): Promise<void> => {
  const { studentId, nodeId, status } = req.body;
  
  // Validate mastery statuses based on schema
  const validStatuses = ['locked', 'unlocked', 'in_progress', 'mastered'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    // UPSERT: Insert new record, or update existing one if it already exists
    const result = await pool.query(`
      INSERT INTO student_mastery (student_id, node_id, status, last_activity_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, node_id) 
      DO UPDATE SET status = EXCLUDED.status, last_activity_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [studentId, nodeId, status]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating mastery status:', error);
    res.status(500).json({ error: 'Server error while updating mastery status' });
  }
};