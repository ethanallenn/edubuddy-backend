import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'edubuddy',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'STEM Forge API is running' });
});

import authRoutes from './routes/authRoutes';
import graphRoutes from './routes/graphRoutes';
import workshopRoutes from './routes/workshopRoutes';
import cohortRoutes from './routes/cohortRoutes';
import schoolRoutes from './routes/schoolRoutes';
import masteryRoutes from './routes/masteryRoutes';
import challengeRoutes from './routes/challengeRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/mastery', masteryRoutes);
app.use('/api/challenges', challengeRoutes);

// We will attach specific entity routes here (Users, Cohorts, Graph)

app.listen(port, () => {
  console.log(`STEM Forge Backend listening on port ${port}`);
});
