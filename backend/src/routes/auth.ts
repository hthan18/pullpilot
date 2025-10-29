import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ✅ GitHub OAuth login - return URL to frontend
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.SERVER_URL}/api/auth/github/callback`;
  const scope = 'read:user,user:email,repo';

  console.log("🚀 redirectUri sent to GitHub:", redirectUri);

  console.log('🌍 ENV CHECK:', {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    CLIENT_URL: process.env.CLIENT_URL,
    SERVER_URL: process.env.SERVER_URL,
  });

  if (!clientId) {
    console.error('❌ Missing GITHUB_CLIENT_ID');
    return res.status(500).json({ error: 'GitHub client ID not configured' });
  }

  if (!process.env.SERVER_URL) {
    console.error('❌ Missing SERVER_URL');
    return res.status(500).json({ error: 'SERVER_URL not configured' });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}`;

  console.log('✅ Generated GitHub Auth URL:', githubAuthUrl);
  res.json({ url: githubAuthUrl });
});

// ✅ GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    // Exchange code for access token
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

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;

    // Check or insert user in DB
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

    // Create JWT
    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // Redirect back to frontend
    const redirectUrl = `${process.env.CLIENT_URL}/?token=${jwtToken}`;
    console.log('✅ Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current logged-in user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    const result = await pool.query(
      'SELECT id, username, email, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});


export default router;
