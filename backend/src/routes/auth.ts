import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  clearOauthStateCookieOptions,
  clearSessionCookieOptions,
  oauthStateCookieOptions,
  OAUTH_STATE_COOKIE,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '../config/cookies';
import { env } from '../config/env';
import { encryptToken } from '../security/tokenEncryption';

const router = express.Router();

router.get('/github', (req, res) => {
  const state = randomBytes(32).toString('base64url');
  const redirectUri = `${env.serverUrl}/api/auth/github/callback`;
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');

  githubAuthUrl.searchParams.set('client_id', env.githubClientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);
  res.redirect(githubAuthUrl.toString());
});

router.get('/github/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const returnedState = typeof req.query.state === 'string' ? req.query.state : undefined;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];

  res.clearCookie(OAUTH_STATE_COOKIE, clearOauthStateCookieOptions);

  if (!code || !returnedState || !expectedState) {
    return res.status(400).json({ error: 'Invalid OAuth callback' });
  }

  const returnedStateBuffer = Buffer.from(returnedState);
  const expectedStateBuffer = Buffer.from(expectedState);
  if (
    returnedStateBuffer.length !== expectedStateBuffer.length ||
    !timingSafeEqual(returnedStateBuffer, expectedStateBuffer)
  ) {
    return res.status(400).json({ error: 'OAuth state mismatch' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: env.githubClientId,
        client_secret: env.githubClientSecret,
        code,
        redirect_uri: `${env.serverUrl}/api/auth/github/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error('Failed to get GitHub access token');

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;
    const encryptedAccessToken = encryptToken(accessToken);

    const userResult = await pool.query('SELECT id FROM users WHERE github_id = $1', [githubUser.id.toString()]);
    let userId;

    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO users (github_id, username, email, avatar_url, access_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [githubUser.id.toString(), githubUser.login, githubUser.email, githubUser.avatar_url, encryptedAccessToken]
      );
      userId = insertResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
      await pool.query(
        `UPDATE users
         SET username = $1, email = $2, avatar_url = $3, access_token = $4, updated_at = NOW()
         WHERE id = $5`,
        [githubUser.login, githubUser.email, githubUser.avatar_url, encryptedAccessToken, userId]
      );
    }

    const jwtToken = jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });

    res.cookie(SESSION_COOKIE, jwtToken, sessionCookieOptions);
    res.redirect(`${env.clientUrl}/dashboard`);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar_url FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
  res.status(204).send();
});

export default router;
