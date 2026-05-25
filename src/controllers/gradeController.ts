import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getStudentReportCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { student_id } = req.params;
    const query = `
      SELECT g.*, s.subject_name 
      FROM grades g
      JOIN subjects s ON g.subject_id = s.subject_id
      WHERE g.student_id = $1
      ORDER BY g.date_conducted DESC;
    `;
    const result = await pool.query(query, [student_id]);
    
    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getSubjectPerformanceMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject_id } = req.params;
    const query = `
      SELECT 
        assessment_name,
        ROUND(AVG((score_achieved / score_possible) * 100), 2) as class_percentage_average,
        ROUND(AVG(confidence_level), 1) as class_confidence_average,
        COUNT(grade_id) as total_submissions
      FROM grades
      WHERE subject_id = $1
      GROUP BY assessment_name;
    `;
    const result = await pool.query(query, [subject_id]);
    
    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const createGradeRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { student_id, subject_id, assessment_name, score_achieved, score_possible, confidence_level, feedback, date_conducted } = req.body;
    
    if (!student_id || !subject_id || !assessment_name || score_achieved === undefined || !score_possible || !date_conducted) {
      res.status(400).json({ status: 'fail', message: 'Missing core grade parameters' });
      return;
    }

    const query = `
      INSERT INTO grades (student_id, subject_id, assessment_name, score_achieved, score_possible, confidence_level, feedback, date_conducted)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const result = await pool.query(query, [student_id, subject_id, assessment_name, score_achieved, score_possible, confidence_level, feedback, date_conducted]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};