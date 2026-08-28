import { rateLimit } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

export const apiRequestLimit = env.isProduction ? 150 : 5_000;
export const oauthRequestLimit = env.isProduction ? 20 : 500;
export const reviewRequestLimit = env.isProduction ? 10 : 100;

const sharedOptions = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: (_request: Request, response: Response) => {
    response.status(429).json({ error: 'Too many requests. Please try again later.' });
  },
};

export const createApiRateLimit = (limit = apiRequestLimit) => rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit,
  identifier: 'api',
});

export const apiRateLimit = createApiRateLimit();

export const oauthRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: oauthRequestLimit,
  identifier: 'oauth',
});

export const reviewCreationRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000,
  limit: reviewRequestLimit,
  identifier: 'ai-review',
});
