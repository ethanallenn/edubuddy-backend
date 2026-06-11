import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import challengeRoutes from './routes/challengeRoutes';
import cohortRoutes from './routes/cohortRoutes';
import graphRoutes from './routes/graphRoutes';
import schoolRoutes from './routes/schoolRoutes';
import workshopRoutes from './routes/workshopRoutes';
import masteryRoutes from './routes/masteryRoutes';

const app = express();
const port = process.env.PORT || 3001;
// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/mastery', masteryRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/workshops', workshopRoutes);

app.get('/api', (req, res) => {
  res.send('EduBuddy API is running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});