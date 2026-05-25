import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getSubjectsBySchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE school_id = $1 ORDER BY subject_name ASC', [school_id]);
    
    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, subject_name, academic_year } = req.body;

    if (!school_id || !subject_name || !academic_year) {
      res.status(400).json({ status: 'fail', message: 'All fields are required' });
      return;
    }

    const query = `INSERT INTO subjects (school_id, subject_name, academic_year) VALUES ($1, $2, $3) RETURNING *;`;
    const result = await pool.query(query, [school_id, subject_name, academic_year]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};