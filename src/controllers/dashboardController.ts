import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getTeacherDashboardData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Grab the verified school_id from the 'protect' session middleware payload
    const school_id = req.user?.school_id || '1234567';

    // Fetch all active class slots assigned under this institutional token boundary
    const classesQuery = `
      SELECT class_id, class_name, academic_year, created_at 
      FROM classes 
      WHERE school_id = $1 
      ORDER BY created_at DESC;
    `;
    const classesRes = await pool.query(classesQuery, [school_id]);

    res.status(200).json({
      status: 'success',
      data: {
        classes: classesRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};