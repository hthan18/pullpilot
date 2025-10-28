import express from 'express';
import axios from 'axios';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's GitHub repositories
router.get('/github', async (req: AuthRequest, res) => {
  try {
    // Get user's access token
    const userResult = await pool.query(
      'SELECT access_token FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessToken = userResult.rows[0].access_token;

    // Fetch repos from GitHub
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        sort: 'updated',
        per_page: 100
      }
    });

    const repos = response.data.map((repo: any) => ({
      github_repo_id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      private: repo.private,
      url: repo.html_url
    }));

    res.json(repos);
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get user's connected repositories
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM repositories WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Connect a repository
router.post('/', async (req: AuthRequest, res) => {
  const { github_repo_id, name, full_name, owner } = req.body;

  if (!github_repo_id || !name || !full_name || !owner) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO repositories (user_id, github_repo_id, name, full_name, owner)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, github_repo_id) DO UPDATE
       SET is_active = true
       RETURNING *`,
      [req.userId, github_repo_id, name, full_name, owner]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error connecting repository:', error);
    res.status(500).json({ error: 'Failed to connect repository' });
  }
});

// Disconnect a repository
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE repositories SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ message: 'Repository disconnected', repository: result.rows[0] });
  } catch (error) {
    console.error('Error disconnecting repository:', error);
    res.status(500).json({ error: 'Failed to disconnect repository' });
  }
});

export default router;