import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';

// Helper function to sign JWT tokens
const signToken = (id: string, role: string, school_id: string): string => {
  const secret = (process.env.JWT_SECRET as jwt.Secret) || 'dev_secret';
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '1d',
  };

  return jwt.sign({ id, role, school_id } as jwt.JwtPayload, secret, options);
};

export const getUsersBySchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id } = req.params;
    const query = 'SELECT user_id, school_id, first_name, last_name, email, role, created_at FROM users WHERE school_id = $1 ORDER BY last_name ASC';
    const result = await pool.query(query, [school_id]);
    
    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, first_name, last_name, email, password, role } = req.body;

    if (!school_id || !first_name || !last_name || !email || !password || !role) {
      res.status(400).json({ status: 'fail', message: 'All fields are required' });
      return;
    }

    // Hash the password with a salt round cost of 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (school_id, first_name, last_name, email, password_hash, role) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING user_id, school_id, first_name, last_name, email, role;
    `;
    const result = await pool.query(query, [school_id, first_name, last_name, email, passwordHash, role]);

    // Automatically log them in by generating an active token
    const token = signToken(result.rows[0].user_id, result.rows[0].role, result.rows[0].school_id);

    res.status(201).json({
      status: 'success',
      token,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, school_id } = req.body;

    // Validate that the school_id is also provided alongside credentials
    if (!email || !password || !school_id) {
      res.status(400).json({ status: 'fail', message: 'Please provide email, password, and your school ID' });
      return;
    }

    // Pull user details using BOTH email and school_id to ensure exact match
    const query = 'SELECT * FROM users WHERE email = $1 AND school_id = $2;';
    const result = await pool.query(query, [email, school_id]);
    const user = result.rows[0];

    // If no user found or password verification checks fail
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({
        status: 'fail',
        message: 'Incorrect email, password, or school combination'
      });
      return;
    }

    // Credentials verified! Issue token
    const token = signToken(user.user_id, user.role, user.school_id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user_id: user.user_id,
        school_id: user.school_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, school_id } = req.body;

    if (!email || !school_id) {
      res.status(400).json({ status: 'fail', message: 'Please provide your email and school ID' });
      return;
    }

    // 1. Look up the exact user
    const userQuery = 'SELECT user_id FROM users WHERE email = $1 AND school_id = $2';
    const userResult = await pool.query(userQuery, [email, school_id]);

    // Security check: Don't reveal if the account exists to the frontend
    if (userResult.rows.length === 0) {
      res.status(200).json({ 
        status: 'success', 
        message: 'If an account matches that email and school, a reset link has been sent.' 
      });
      return;
    }

    const userId = userResult.rows[0].user_id;

    // 2. Generate a secure, raw token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3. Hash the token for database storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 4. Set expiration (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 5. Clean up any existing tokens for this user, then save the new one
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    
    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    // 6. Construct the reset URL.
    // Prefer the configured frontend origin, but fall back to local dev so the link never becomes undefined.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetURL = `${frontendUrl}/${school_id}/reset-password?token=${resetToken}`;
    
    // DEV ONLY: Log this to your terminal so you can test the flow before emails are set up
    console.log(`[DEV ONLY] Password reset link generated:`, resetURL);

    try {
      await sendPasswordResetEmail({
        toEmail: email,
        resetUrl: resetURL,
      });
    } catch (emailError) {
      console.error('Email dispatch failed:', emailError);
      await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
      
      // FIX: Separated the status/json call from the return statement
      res.status(500).json({ 
        status: 'error', 
        message: 'There was an error sending the email. Please try again later.' 
      });
      return;
    }

    res.status(200).json({ 
      status: 'success', 
      message: 'If an account matches that email and school, a reset link has been sent.' 
    });

  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ status: 'fail', message: 'Token and new password are required' });
      return;
    }

    // 1. Hash the incoming raw token to compare with the database
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Find the valid, unexpired token in the database
    const tokenResult = await pool.query(
      `SELECT user_id FROM password_resets 
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired.' });
      return;
    }

    const userId = tokenResult.rows[0].user_id;

    // 3. Hash the new password
    const saltRounds = 12; // Matching the cost used in createUser
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update the user's password in the users table
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    // 5. Delete the used token to prevent reuse
    await pool.query(
      `DELETE FROM password_resets WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({ 
      status: 'success',
      message: 'Password has been successfully reset.' 
    });

  } catch (error) {
    // Passes the error down to Express's global error handler
    next(error); 
  }
};