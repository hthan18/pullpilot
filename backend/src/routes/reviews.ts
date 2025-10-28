import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.use(authenticateToken);

// Get all reviews for a repository
router.get('/repository/:repoId', async (req: AuthRequest, res) => {
  const { repoId } = req.params;

  try {
    // Verify repository belongs to user
    const repoCheck = await pool.query(
      'SELECT * FROM repositories WHERE id = $1 AND user_id = $2',
      [repoId, req.userId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const result = await pool.query(
      'SELECT * FROM reviews WHERE repository_id = $1 ORDER BY created_at DESC',
      [repoId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Trigger code review for a PR
router.post('/', async (req: AuthRequest, res) => {
  const { repositoryId, prNumber } = req.body;

  if (!repositoryId || !prNumber) {
    return res.status(400).json({ error: 'Missing repositoryId or prNumber' });
  }

  try {
    // Get repository and user info
    const repoResult = await pool.query(
      `SELECT r.*, u.access_token 
       FROM repositories r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.id = $1 AND r.user_id = $2`,
      [repositoryId, req.userId]
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const repo = repoResult.rows[0];

    // Fetch PR details from GitHub
    const prResponse = await axios.get(
      `https://api.github.com/repos/${repo.full_name}/pulls/${prNumber}`,
      { headers: { Authorization: `Bearer ${repo.access_token}` } }
    );

    const pr = prResponse.data;

    // Fetch PR diff
    const diffResponse = await axios.get(pr.diff_url, {
      headers: { Authorization: `Bearer ${repo.access_token}` }
    });

    const diff = diffResponse.data;

    // Create review record
    const reviewResult = await pool.query(
      `INSERT INTO reviews (repository_id, pr_number, pr_title, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [repositoryId, prNumber, pr.title]
    );

    const review = reviewResult.rows[0];

    // Analyze code with OpenAI (async - don't wait)
    analyzeCodeWithAI(review.id, diff, pr.title).catch(console.error);

    res.status(201).json(review);
  } catch (error: any) {
    console.error('Error creating review:', error);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Pull request not found' });
    }
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Analyze code with OpenAI
async function analyzeCodeWithAI(reviewId: number, diff: string, prTitle: string) {
  try {
    // Limit diff size to avoid token limits (max ~3000 lines)
    const truncatedDiff = diff.split('\n').slice(0, 3000).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Analyze the following pull request diff and provide:
1. Security vulnerabilities
2. Code quality issues
3. Best practice violations
4. Performance concerns
5. Suggestions for improvement

Format your response as JSON with these keys: security, quality, bestPractices, performance, suggestions.
Each should be an array of objects with "issue" and "description" fields.`
        },
        {
          role: 'user',
          content: `PR Title: ${prTitle}\n\nCode Diff:\n${truncatedDiff}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const analysis = completion.choices[0].message.content;
    
    // Try to parse as JSON, fallback to raw text
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysis || '{}');
    } catch {
      analysisResult = { rawAnalysis: analysis };
    }

    // Update review with results
    await pool.query(
      `UPDATE reviews 
       SET status = 'completed', 
           analysis_result = $1, 
           completed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(analysisResult), reviewId]
    );

    console.log(`✅ Review ${reviewId} completed`);
  } catch (error) {
    console.error(`❌ Error analyzing review ${reviewId}:`, error);
    
    // Mark as failed
    await pool.query(
      `UPDATE reviews 
       SET status = 'failed', 
           completed_at = NOW()
       WHERE id = $1`,
      [reviewId]
    );
  }
}

// Get specific review
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.* FROM reviews r
       JOIN repositories repo ON r.repository_id = repo.id
       WHERE r.id = $1 AND repo.user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

export default router;