import { Request, Response } from 'express';
import { pool } from '../db';

export const getWorkshops = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT w.*, u.name as teacher_name 
      FROM workshops w
      JOIN users u ON w.teacher_id = u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ error: 'Server error while fetching workshops' });
  }
};

export const createWorkshop = async (req: Request, res: Response) => {
  const { title, description, teacher_id } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO workshops (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
      [title, description, teacher_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workshop:', error);
    res.status(500).json({ error: 'Server error while creating workshop' });
  }
};
