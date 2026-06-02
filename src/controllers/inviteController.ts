import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { sendFacultyInviteEmail } from '../utils/emailService.js'; // Import the mail helper
import { appendAdminActivity, listAdminActivities } from '../utils/adminActivityStore.js';

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

    const insertedInvites: Array<Record<string, unknown>> = [];
    const inviteHistory: Array<{ first_name: string; last_name: string; email: string; role: 'admin' | 'teacher'; status: 'sent' | 'failed'; error?: string }> = [];
    let mailFailureCount = 0;
    
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
      let inviteStatus: 'sent' | 'failed' = 'sent';
      let inviteError: string | undefined;
      
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
        mailFailureCount += 1;
        inviteStatus = 'failed';
        inviteError = mailError instanceof Error ? mailError.message : 'Email dispatch failed';
      }

      inviteHistory.push({
        first_name,
        last_name,
        email: email.toLowerCase(),
        role,
        status: inviteStatus,
        error: inviteError,
      });
    }

    const activity = await appendAdminActivity({
      school_id,
      type: 'invite_batch',
      status: 'success',
      title: 'Staff invites sent',
      message: `${insertedInvites.length} staff invitation(s) were created and emailed.${mailFailureCount > 0 ? ` ${mailFailureCount} email(s) failed.` : ''}`,
      meta: {
        total_requested: invites.length,
        total_processed: insertedInvites.length,
        mail_failures: mailFailureCount,
        invites: inviteHistory,
        school_name: schoolName
      },
    });

    res.status(201).json({
      status: 'success',
      message: `${insertedInvites.length} faculty invitations committed and sent successfully.`,
      data: insertedInvites,
      activity
    });
  } catch (error) {

    next(error);
  }
};

export const getInviteHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = (req as Request & { user?: { school_id?: string } }).user?.school_id;

    if (!schoolId) {
      res.status(401).json({ status: 'fail', message: 'Missing authenticated school context.' });
      return;
    }

    const activities = await listAdminActivities(schoolId, 50);
    const history = activities.filter((activity) => activity.type === 'invite_batch').slice(0, 12);

    res.status(200).json({
      status: 'success',
      results: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};