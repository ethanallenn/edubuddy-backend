import { Request, Response } from 'express';
import { pool } from '../db';

export const getCohorts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, s.name as school_name 
      FROM cohorts c
      LEFT JOIN schools s ON c.school_id = s.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    res.status(500).json({ error: 'Server error while fetching cohorts' });
  }
};

export const createCohort = async (req: Request, res: Response) => {
  const { name, school_id, year_group_uk } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO cohorts (name, school_id, year_group_uk) VALUES ($1, $2, $3) RETURNING *',
      [name, school_id, year_group_uk]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cohort:', error);
    res.status(500).json({ error: 'Server error while creating cohort' });
  }
};
