import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getAllSchools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM schools ORDER BY school_name ASC');
    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const createSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, school_name, postcode } = req.body;

    // Validation update to include school_id constraint checks
    if (!school_id || !school_name || !postcode) {
      res.status(400).json({
        status: 'fail',
        message: 'Missing fields: school_id (7-digit DENI number), school_name, and postcode are mandatory'
      });
      return;
    }

    if (school_id.length !== 7 || isNaN(Number(school_id))) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid DENI format. School ID must be an exact 7-digit numerical code.'
      });
      return;
    }

    const query = `
      INSERT INTO schools (school_id, school_name, postcode)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [school_id, school_name, postcode]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};