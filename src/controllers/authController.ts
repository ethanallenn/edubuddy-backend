import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  try {
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user, relying on DB constraint for email uniqueness
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name, email, passwordHash, role || 'teacher']
    );

    const user = result.rows[0];
    // Generate a simple token (Note: a real app should use jwt.sign here)
    const token = Buffer.from(`${user.id}:${user.email}`).toString('base64');

    res.status(201).json({ user, token });
  } catch (err: any) {
    // Catch unique violation for email (PostgreSQL error code 23505)
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email is already in use.' });
      return;
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = Buffer.from(`${user.id}:${user.email}`).toString('base64');
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};