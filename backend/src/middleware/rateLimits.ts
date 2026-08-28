import { rateLimit } from 'express-rate-limit';
import { Request, Response } from 'express';

const sharedOptions = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: (_request: Request, response: Response) => {
    response.status(429).json({ error: 'Too many requests. Please try again later.' });
  },
};

export const apiRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: 150,
  identifier: 'api',
});

export const oauthRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  identifier: 'oauth',
});

export const reviewCreationRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  identifier: 'ai-review',
});
