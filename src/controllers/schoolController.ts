import { Request, Response } from 'express';
import { pool } from '../db';

export const getSchools = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM schools');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Server error while fetching schools' });
  }
};

export const createSchool = async (req: Request, res: Response) => {
  const { name, region } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO schools (name, region) VALUES ($1, $2) RETURNING *',
      [name, region || 'ENG']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Server error while creating school' });
  }
};
