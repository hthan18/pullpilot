import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { apiRateLimit } from './middleware/rateLimits';
import { requireTrustedOrigin } from './middleware/trustedOrigin';
import authRoutes from './routes/auth';
import issueRoutes from './routes/issues';
import repoRoutes from './routes/repositories';
import reviewRoutes from './routes/reviews';

export const app = express();
app.set('trust proxy', env.isProduction ? 1 : false);
app.disable('x-powered-by');

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requireTrustedOrigin);
app.use('/api', apiRateLimit);

app.use('/api/auth', authRoutes);
app.use('/api/repositories', repoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/issues', issueRoutes);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((error: Error & { status?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error.stack);
  const status = error.status === 413 ? 413 : 500;
  response.status(status).json({
    error: status === 413 ? 'Request body is too large' : 'Something went wrong!',
    message: env.nodeEnvironment === 'development' ? error.message : undefined,
  });
});
