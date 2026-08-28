import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import repoRoutes from './routes/repositories';
import reviewRoutes from './routes/reviews';
import issueRoutes from './routes/issues';
import { env } from './config/env';
import { requireTrustedOrigin } from './middleware/trustedOrigin';
import { apiRateLimit } from './middleware/rateLimits';

export const app = express();
app.set('trust proxy', env.isProduction ? 1 : false);
app.disable('x-powered-by');

// Middleware
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requireTrustedOrigin);
app.use('/api', apiRateLimit);

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
app.use((err: Error & { status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  const status = err.status === 413 ? 413 : 500;
  res.status(status).json({
    error: status === 413 ? 'Request body is too large' : 'Something went wrong!',
    message: env.nodeEnvironment === 'development' ? err.message : undefined
  });
});

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnvironment}`);
  });
}
