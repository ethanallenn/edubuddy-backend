import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { appendAdminActivity, listAdminActivities } from '../utils/adminActivityStore.js';

export const batchIngestStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let school_id = '';
  let class_name = '';
  let academic_year = '';
  let students: Array<{ first_name: string; last_name: string; email?: string; candidate_number?: string }> = [];

  try {
    ({ school_id, class_name, academic_year, students } = req.body);

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

      const activity = await appendAdminActivity({
        school_id,
        type: 'student_import',
        class_name,
        academic_year,
        status: 'success',
        title: 'Student import completed',
        message: `Successfully structured class "${class_name}" with ${insertedStudents.length} pupils mapped.`,
        meta: {
          total_requested: students.length,
          total_processed: insertedStudents.length,
          class_id: classId,
          students: insertedStudents.map((student) => ({
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email ?? undefined,
            candidate_number: student.candidate_number ?? undefined,
          })),
        },
      });
      
      res.status(201).json({
        status: 'success',
        message: `Successfully structured class "${class_name}" with ${insertedStudents.length} pupils mapped.`,
        data: {
          class_id: classId,
          students: insertedStudents
        },
        activity
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      console.error('❌ [DB Transaction Fatal Error] Rolling back active operation sequence:', txError);
      await appendAdminActivity({
        school_id,
        type: 'student_import',
        status: 'failed',
        title: 'Student import failed',
        message: txError instanceof Error ? txError.message : 'Unknown import error.',
        meta: {
          class_name,
          academic_year,
          total_requested: Array.isArray(students) ? students.length : 0,
          total_processed: 0,
          students: Array.isArray(students)
            ? students.map((student) => ({
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                candidate_number: student.candidate_number,
              }))
            : [],
        },
      }).catch(() => undefined);
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getImportHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = (req as Request & { user?: { school_id?: string } }).user?.school_id;

    if (!schoolId) {
      res.status(401).json({ status: 'fail', message: 'Missing authenticated school context.' });
      return;
    }

    const activities = await listAdminActivities(schoolId, 50);
    const history = activities.filter((activity) => activity.type === 'student_import').slice(0, 12);

    res.status(200).json({
      status: 'success',
      results: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};