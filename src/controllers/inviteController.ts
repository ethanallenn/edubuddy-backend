import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { sendFacultyInviteEmail } from '../utils/emailService.js'; // Import the mail helper

export const createBatchInvitations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, invites } = req.body;

    if (!school_id || !invites || !Array.isArray(invites)) {
      res.status(400).json({ status: 'fail', message: 'Missing school_id or invites array' });
      return;
    }

    // 1. Fetch the school name so our email looks personalized and authentic
    const schoolQuery = 'SELECT school_name FROM schools WHERE school_id = $1;';
    const schoolRes = await pool.query(schoolQuery, [school_id]);
    
    if (schoolRes.rows.length === 0) {
      res.status(404).json({ status: 'fail', message: 'Associated institution not found.' });
      return;
    }
    const schoolName = schoolRes.rows[0].school_name;

    const insertedInvites = [];
    
    // 2. Loop through array, insert rows, and automatically send invitations
    for (const invite of invites) {
      const { first_name, last_name, email, role } = invite;
      if (!first_name || !last_name || !email || !role) continue;

      const query = `
        INSERT INTO invitations (school_id, first_name, last_name, email, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (school_id, email) DO UPDATE 
        SET role = EXCLUDED.role 
        RETURNING *;
      `;
      
      const result = await pool.query(query, [school_id, first_name, last_name, email.toLowerCase(), role]);
      insertedInvites.push(result.rows[0]);
      
      // 3. Fire the custom HTML email out via Nodemailer background threads
      try {
        await sendFacultyInviteEmail({
          toEmail: email.toLowerCase(),
          firstName: first_name,
          schoolName: schoolName,
          schoolId: school_id,
          role: role
        });
      } catch (mailError) {
        // Log mail errors to console but don't crash the whole DB batch transaction loop
        console.error(`⚠️ Email dispatch failed for ${email}:`, mailError);
      }
    }

    res.status(201).json({
      status: 'success',
      message: `${insertedInvites.length} faculty invitations committed and sent successfully.`,
      data: insertedInvites
    });
  } catch (error) {
    next(error);
  }
};