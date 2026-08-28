import axios from 'axios';
import express from 'express';
import pool from '../config/db';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { generateReview } from '../reviews/openaiReviewer';
import { prepareDiff } from '../reviews/prepareDiff';
import { GitHubPullRequestFile } from '../reviews/types';
import { decryptToken } from '../security/tokenEncryption';
import { reviewCreationRateLimit } from '../middleware/rateLimits';

const router = express.Router();
router.use(authenticateToken);

function positiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

router.get('/repository/:repoId', async (req: AuthRequest, res) => {
  const repoId = positiveInteger(req.params.repoId);
  if (!repoId) return res.status(400).json({ error: 'Invalid repository ID' });
  try {
    const repoCheck = await pool.query('SELECT id FROM repositories WHERE id = $1 AND user_id = $2', [repoId, req.userId]);
    if (repoCheck.rows.length === 0) return res.status(404).json({ error: 'Repository not found' });
    const result = await pool.query('SELECT * FROM reviews WHERE repository_id = $1 ORDER BY created_at DESC', [repoId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/', reviewCreationRateLimit, async (req: AuthRequest, res) => {
  const repositoryId = positiveInteger(req.body.repositoryId);
  const prNumber = positiveInteger(req.body.prNumber);
  if (!repositoryId || !prNumber) return res.status(400).json({ error: 'repositoryId and prNumber must be positive integers' });

  try {
    const repoResult = await pool.query(
      `SELECT r.*, u.access_token FROM repositories r JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [repositoryId, req.userId]
    );
    if (repoResult.rows.length === 0) return res.status(404).json({ error: 'Repository not found' });
    const repo = repoResult.rows[0];
    const accessToken = decryptToken(repo.access_token);
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' };
    const prResponse = await axios.get(`https://api.github.com/repos/${repo.full_name}/pulls/${prNumber}`, { headers });
    const filesResponse = await axios.get<GitHubPullRequestFile[]>(
      `https://api.github.com/repos/${repo.full_name}/pulls/${prNumber}/files`,
      { headers, params: { per_page: 100 } }
    );
    const prepared = prepareDiff(filesResponse.data);
    const reviewResult = await pool.query(
      `INSERT INTO reviews (repository_id, pr_number, pr_title, status, files_reviewed, files_skipped)
       VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING *`,
      [repositoryId, prNumber, prResponse.data.title, prepared.analyzedFiles.length, prepared.skippedFiles.length]
    );
    const review = reviewResult.rows[0];
    void processReview(review.id, prResponse.data.title, prepared).catch((error) => console.error(`Unexpected review processor failure for ${review.id}:`, error));
    res.status(201).json(review);
  } catch (error: any) {
    console.error('Error creating review:', error);
    if (error.response?.status === 404) return res.status(404).json({ error: 'Pull request not found' });
    res.status(500).json({ error: 'Failed to create review' });
  }
});

async function processReview(reviewId: number, prTitle: string, prepared: ReturnType<typeof prepareDiff>) {
  try {
    await pool.query('UPDATE reviews SET started_at = NOW() WHERE id = $1', [reviewId]);
    const generated = await generateReview(prTitle, prepared.prompt);
    const analysis = { ...generated.result, metadata: { analyzedFiles: prepared.analyzedFiles, skippedFiles: prepared.skippedFiles } };
    await pool.query(
      `UPDATE reviews SET status = 'completed', analysis_result = $1, model = $2,
       input_tokens = $3, output_tokens = $4, completed_at = NOW(), error_message = NULL WHERE id = $5`,
      [JSON.stringify(analysis), generated.model, generated.inputTokens, generated.outputTokens, reviewId]
    );
    console.log(`Review ${reviewId} completed with ${generated.model}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown review error';
    console.error(`Error analyzing review ${reviewId}:`, message);
    await pool.query(`UPDATE reviews SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`, [message.slice(0, 500), reviewId]);
  }
}

router.get('/:id', async (req: AuthRequest, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid review ID' });
  try {
    const result = await pool.query(
      `SELECT r.* FROM reviews r JOIN repositories repo ON r.repository_id = repo.id
       WHERE r.id = $1 AND repo.user_id = $2`,
      [id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

export default router;
