import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SESSION_COOKIE } from '../config/cookies';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: number;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.[SESSION_COOKIE];

  if (!token) return res.status(401).json({ error: 'No active session' });

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
