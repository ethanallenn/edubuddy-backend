import { Pool } from 'pg';

// Centralized database connection pool
export const pool = new Pool({
  user: process.env.DB_USER || 'ethan',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'edubuddy',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 5432,
});