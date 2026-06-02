import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import schoolRoutes from './routes/schoolRoutes.js';
import userRoutes from './routes/userRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import gradeRoutes from './routes/gradeRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { globalErrorHandler } from './middleware/errorHandler.js'; // 1. Import handler

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/schools', schoolRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/invites', inviteRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Catch-all for missing endpoints
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Resource not found: ${req.originalUrl}`
  });
});

// 2. Register Global Error Handler (MUST be the final middleware)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`🚀 EduBuddy Engine live on http://localhost:${PORT}`);
});