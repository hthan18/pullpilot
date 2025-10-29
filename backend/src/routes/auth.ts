import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GitHub OAuth login - redirect user to GitHub
router.get('/github', (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user:email`;
  res.json({ url: githubAuthUrl });
});

// GitHub OAuth callback
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
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const githubUser = userResponse.data;

    // Check or insert user
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

    // Generate JWT token
    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // Redirect back to frontend with token
    res.redirect(`${process.env.CLIENT_URL}?token=${jwtToken}`);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, github_id, username, email, avatar_url FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
