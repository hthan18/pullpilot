import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GitHub OAuth login - return URL to frontend
router.get('/github', (_req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `https://pullpilot-production.up.railway.app/api/auth/github/callback`;
  const scope = 'read:user,user:email,repo';

  if (!clientId) {
    console.error('❌ Missing GITHUB_CLIENT_ID');
    return res.status(500).json({ error: 'GitHub client ID not configured' });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}`;

  res.json({ url: githubAuthUrl });
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error('Failed to get GitHub access token');

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;

    let userResult = await pool.query('SELECT * FROM users WHERE github_id = $1', [githubUser.id.toString()]);
    let userId;

    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO users (github_id, username, email, avatar_url, access_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [githubUser.id.toString(), githubUser.login, githubUser.email, githubUser.avatar_url, accessToken]
      );
      userId = insertResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
      await pool.query(
        `UPDATE users SET access_token = $1, avatar_url = $2 WHERE id = $3`,
        [accessToken, githubUser.avatar_url, userId]
      );
    }

    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.redirect(`${process.env.CLIENT_URL}/?token=${jwtToken}`);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
