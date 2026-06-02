import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

type AuthRequest = Request & { user?: { school_id: string } };

type ClassDashboardRequest = AuthRequest & {
  params: { classId: string };
};

export const getTeacherDashboardData = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const school_id = req.user?.school_id;

    if (!school_id) {
      res.status(401).json({
        status: 'fail',
        message: 'Missing school context on authenticated request.'
      });
      return;
    }

    const [classesRes, classAndStudentRes] = await Promise.all([
      pool.query(
        `
          SELECT class_id, class_name, academic_year, created_at
          FROM classes
          WHERE school_id = $1
          ORDER BY created_at DESC;
        `,
        [school_id]
      ),
      pool.query(
        `
          SELECT
            COUNT(DISTINCT c.class_id)::int AS class_count,
            COUNT(DISTINCT s.student_id)::int AS student_count
          FROM classes c
          LEFT JOIN students s ON s.class_id = c.class_id
          WHERE c.school_id = $1;
        `,
        [school_id]
      ),
    ]);

    const gradesTableExistsRes = await pool.query(`SELECT to_regclass('public.grades') IS NOT NULL AS grades_table_exists;`);
    const gradesTableExists = Boolean(gradesTableExistsRes.rows[0]?.grades_table_exists);

    let assessmentCount = 0;
    let averagePerformance = 0;

    if (gradesTableExists) {
      const gradesSummaryRes = await pool.query(
        `
          SELECT
            COUNT(g.grade_id)::int AS assessment_count,
            COALESCE(ROUND(AVG(CASE WHEN g.score_possible > 0 THEN (g.score_achieved::numeric / g.score_possible) * 100 END), 1), 0) AS average_performance
          FROM classes c
          LEFT JOIN students s ON s.class_id = c.class_id
          LEFT JOIN grades g ON g.student_id = s.student_id
          WHERE c.school_id = $1;
        `,
        [school_id]
      );

      assessmentCount = Number(gradesSummaryRes.rows[0]?.assessment_count) || 0;
      averagePerformance = Number(gradesSummaryRes.rows[0]?.average_performance) || 0;
    }

    const summary = classAndStudentRes.rows[0] ?? {
      class_count: 0,
      student_count: 0,
    };

    res.status(200).json({
      status: 'success',
      data: {
        classes: classesRes.rows,
        summary: {
          classCount: Number(summary.class_count) || 0,
          studentCount: Number(summary.student_count) || 0,
          assessmentCount,
          averagePerformance,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getClassDashboardData = async (req: ClassDashboardRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const school_id = req.user?.school_id;
    const { classId } = req.params;

    if (!school_id) {
      res.status(401).json({
        status: 'fail',
        message: 'Missing school context on authenticated request.'
      });
      return;
    }

    if (!classId) {
      res.status(400).json({
        status: 'fail',
        message: 'Missing class identifier.'
      });
      return;
    }

    const classResult = await pool.query(
      `
        SELECT class_id, class_name, academic_year, created_at
        FROM classes
        WHERE class_id = $1 AND school_id = $2;
      `,
      [classId, school_id]
    );

    if (classResult.rows.length === 0) {
      res.status(404).json({
        status: 'fail',
        message: 'Class not found for the current school.'
      });
      return;
    }

    const rosterResult = await pool.query(
      `
        SELECT student_id, first_name, last_name, email, candidate_number, created_at
        FROM students
        WHERE class_id = $1
        ORDER BY last_name ASC, first_name ASC;
      `,
      [classId]
    );

    const gradesTableExistsRes = await pool.query(`SELECT to_regclass('public.grades') IS NOT NULL AS grades_table_exists;`);
    const gradesTableExists = Boolean(gradesTableExistsRes.rows[0]?.grades_table_exists);

    const assignmentsTableExistsRes = await pool.query(`SELECT to_regclass('public.class_assignments') IS NOT NULL AS assignments_table_exists;`);
    const assignmentsTableExists = Boolean(assignmentsTableExistsRes.rows[0]?.assignments_table_exists);

    let metrics = {
      studentCount: rosterResult.rows.length,
      assessmentCount: 0,
      averagePerformance: 0,
      subjectCount: 0,
    };
    let assessments: Array<{
      assessment_name: string;
      subject_name: string | null;
      submissions: number;
      average_score: number;
      average_percentage: number;
      latest_date: string | null;
    }> = [];
    let assignments: Array<{
      assignment_id: string;
      title: string;
      template_key: string;
      description: string | null;
      due_date: string | null;
      estimated_duration_mins: number | null;
      status: string;
      created_at: string | null;
    }> = [];

    if (gradesTableExists) {
      const metricsResult = await pool.query(
        `
          SELECT
            COUNT(g.grade_id)::int AS assessment_count,
            COUNT(DISTINCT g.subject_id)::int AS subject_count,
            COALESCE(ROUND(AVG(CASE WHEN g.score_possible > 0 THEN (g.score_achieved::numeric / g.score_possible) * 100 END), 1), 0) AS average_performance
          FROM students s
          LEFT JOIN grades g ON g.student_id = s.student_id
          WHERE s.class_id = $1;
        `,
        [classId]
      );

      metrics = {
        studentCount: rosterResult.rows.length,
        assessmentCount: Number(metricsResult.rows[0]?.assessment_count) || 0,
        averagePerformance: Number(metricsResult.rows[0]?.average_performance) || 0,
        subjectCount: Number(metricsResult.rows[0]?.subject_count) || 0,
      };

      const assessmentsResult = await pool.query(
        `
          SELECT
            g.assessment_name,
            s2.subject_name,
            COUNT(g.grade_id)::int AS submissions,
            ROUND(AVG(g.score_achieved), 2) AS average_score,
            COALESCE(ROUND(AVG(CASE WHEN g.score_possible > 0 THEN (g.score_achieved::numeric / g.score_possible) * 100 END), 1), 0) AS average_percentage,
            MAX(g.date_conducted)::text AS latest_date
          FROM grades g
          INNER JOIN students st ON st.student_id = g.student_id
          LEFT JOIN subjects s2 ON s2.subject_id = g.subject_id
          WHERE st.class_id = $1
          GROUP BY g.assessment_name, s2.subject_name
          ORDER BY latest_date DESC, g.assessment_name ASC;
        `,
        [classId]
      );

      assessments = assessmentsResult.rows.map((row) => ({
        assessment_name: row.assessment_name,
        subject_name: row.subject_name,
        submissions: Number(row.submissions) || 0,
        average_score: Number(row.average_score) || 0,
        average_percentage: Number(row.average_percentage) || 0,
        latest_date: row.latest_date,
      }));
    }

    if (assignmentsTableExists) {
      const assignmentsResult = await pool.query(
        `
          SELECT
            assignment_id,
            title,
            template_key,
            description,
            due_date::text AS due_date,
            estimated_duration_mins,
            status,
            created_at::text AS created_at
          FROM class_assignments
          WHERE class_id = $1
          ORDER BY created_at DESC;
        `,
        [classId]
      );

      assignments = assignmentsResult.rows.map((row) => ({
        assignment_id: row.assignment_id,
        title: row.title,
        template_key: row.template_key,
        description: row.description,
        due_date: row.due_date,
        estimated_duration_mins: row.estimated_duration_mins === null ? null : Number(row.estimated_duration_mins),
        status: row.status,
        created_at: row.created_at,
      }));
    }

    res.status(200).json({
      status: 'success',
      data: {
        class: classResult.rows[0],
        roster: rosterResult.rows,
        metrics,
        assessments,
        assignments,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createClassAssignment = async (req: ClassDashboardRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const school_id = req.user?.school_id;
    const { classId } = req.params;
    const { title, template_key, description, due_date, estimated_duration_mins, status } = req.body;

    if (!school_id) {
      res.status(401).json({ status: 'fail', message: 'Missing school context on authenticated request.' });
      return;
    }

    if (!classId || !title || !template_key) {
      res.status(400).json({ status: 'fail', message: 'Missing assignment title, template, or class identifier.' });
      return;
    }

    const classResult = await pool.query(
      `SELECT class_id FROM classes WHERE class_id = $1 AND school_id = $2;`,
      [classId, school_id]
    );

    if (classResult.rows.length === 0) {
      res.status(404).json({ status: 'fail', message: 'Class not found for the current school.' });
      return;
    }

    const insertResult = await pool.query(
      `
        INSERT INTO class_assignments (
          class_id,
          title,
          template_key,
          description,
          due_date,
          estimated_duration_mins,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING assignment_id, class_id, title, template_key, description, due_date::text AS due_date, estimated_duration_mins, status, created_at::text AS created_at;
      `,
      [
        classId,
        title,
        template_key,
        description ?? null,
        due_date ?? null,
        estimated_duration_mins ?? null,
        status ?? 'draft',
      ]
    );

    res.status(201).json({
      status: 'success',
      data: insertResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};