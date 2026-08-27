import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import repoRoutes from './routes/repositories';
import reviewRoutes from './routes/reviews';
import issueRoutes from './routes/issues';
import { env } from './config/env';
import { requireTrustedOrigin } from './middleware/trustedOrigin';

const app = express();

// Middleware
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(requireTrustedOrigin);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/repositories', repoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/issues', issueRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: env.nodeEnvironment === 'development' ? err.message : undefined
  });
});

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnvironment}`);
});
