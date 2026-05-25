import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const batchIngestStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, class_name, academic_year, students } = req.body;

    console.log('📥 [API Batch-Ingest] Incoming Payload Request:');
    console.log(` -> School ID (DENI): "${school_id}"`);
    console.log(` -> Class Group Name: "${class_name}"`);
    console.log(` -> Academic Year   : "${academic_year}"`);
    console.log(` -> Total Students  : ${students ? students.length : 0}`);

    if (!school_id || !class_name || !academic_year || !students || !Array.isArray(students)) {
      res.status(400).json({ 
        status: 'fail', 
        message: 'Missing core configuration payload parameter elements.' 
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 🔥 NEW DEVELOPMENT FAIL-SAFE: 
      // Ensure the school exists in the parent table so foreign key constraints never break
      const schoolCheckQuery = `
        INSERT INTO schools (school_id, school_name, postcode)
        VALUES ($1, $2, $3)
        ON CONFLICT (school_id) DO NOTHING;
      `;
      // Creates a dummy school instance profile if '1234567' or any other test code is missing
      await client.query(schoolCheckQuery, [
        school_id, 
        `Development Test School (${school_id})`, 
        'BT9 5AJ'
      ]);

      // 1. Upsert the parent class container node cleanly
      const classUpsertQuery = `
        INSERT INTO classes (school_id, class_name, academic_year)
        VALUES ($1, $2, $3)
        ON CONFLICT (school_id, class_name, academic_year) 
        DO UPDATE SET class_name = EXCLUDED.class_name
        RETURNING class_id;
      `;
      const classRes = await client.query(classUpsertQuery, [school_id, class_name, academic_year]);
      const classId = classRes.rows[0].class_id;
      
      const insertedStudents = [];

      // 2. Loop through and map each student profile record to that class container ID
      for (const student of students) {
        const { first_name, last_name, email, candidate_number } = student;
        
        if (!first_name || !last_name) continue;

        const formattedEmail = email && email.trim() ? email.trim().toLowerCase() : null;
        const formattedCandidateNum = candidate_number && candidate_number.trim() ? candidate_number.trim() : null;

        const studentQuery = `
          INSERT INTO students (school_id, class_id, first_name, last_name, email, candidate_number)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (school_id, email) WHERE email IS NOT NULL
          DO UPDATE SET class_id = EXCLUDED.class_id, candidate_number = EXCLUDED.candidate_number
          RETURNING *;
        `;
        
        const studentRes = await client.query(studentQuery, [
          school_id,
          classId,
          first_name.trim(),
          last_name.trim(),
          formattedEmail,
          formattedCandidateNum
        ]);
        
        insertedStudents.push(studentRes.rows[0]);
      }

      await client.query('COMMIT');
      console.log(`🎉 [DB Transaction] Successfully committed ${insertedStudents.length} rows to Postgres.`);
      
      res.status(201).json({
        status: 'success',
        message: `Successfully structured class "${class_name}" with ${insertedStudents.length} pupils mapped.`,
        data: {
          class_id: classId,
          students: insertedStudents
        }
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      console.error('❌ [DB Transaction Fatal Error] Rolling back active operation sequence:', txError);
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};