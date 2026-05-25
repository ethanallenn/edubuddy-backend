import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Helper function to sign JWT tokens
const signToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
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
      RETURNING user_id, first_name, last_name, email, role;
    `;
    const result = await pool.query(query, [school_id, first_name, last_name, email, passwordHash, role]);

    // Automatically log them in by generating an active token
    const token = signToken(result.rows[0].user_id, result.rows[0].role);

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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: 'fail', message: 'Please provide both email and password' });
      return;
    }

    // Pull user details along with the stored hash
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await pool.query(query, [email]);
    const user = result.rows[0];

    // If no user found or password verification checks fail
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password combination'
      });
      return;
    }

    // Credentials verified! Issue token
    const token = signToken(user.user_id, user.role);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user_id: user.user_id,
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