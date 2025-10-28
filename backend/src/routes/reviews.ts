import express from 'express';
import axios from 'axios';
import pool from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

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

    // Analyze code with demo AI (async - don't wait)
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

// Analyze code with demo AI responses
async function analyzeCodeWithAI(reviewId: number, diff: string, prTitle: string) {
  try {
    // DEMO MODE: Return realistic mock analysis
    const demoAnalysis = {
      security: [
        {
          issue: "SQL Injection Vulnerability",
          description: "The code uses string concatenation for API URL construction ('/api/search?q=' + query), which can lead to injection attacks. Use URL parameters or proper sanitization."
        },
        {
          issue: "No Input Validation",
          description: "User input is not validated or sanitized before being used in DOM operations and API calls. This could allow XSS attacks."
        }
      ],
      quality: [
        {
          issue: "TypeScript 'any' Types",
          description: "Multiple uses of 'any' type (props: any, note: any) defeats the purpose of TypeScript. Define proper interfaces for better type safety."
        },
        {
          issue: "Direct DOM Manipulation",
          description: "Using document.querySelectorAll and direct style manipulation is an anti-pattern in React. Use React state and conditional rendering instead."
        },
        {
          issue: "Unused Variable",
          description: "The fetchSearchResults function is defined but never called, indicating dead code that should be removed."
        }
      ],
      bestPractices: [
        {
          issue: "Missing Error Handling",
          description: "The fetchSearchResults async function has no try-catch block. This will cause unhandled promise rejections if the API call fails."
        },
        {
          issue: "Missing Accessibility Attributes",
          description: "Input and button elements lack proper ARIA labels and accessibility attributes. Add aria-label or proper label elements."
        },
        {
          issue: "No PropTypes Validation",
          description: "Component accepts 'any' props without validation. Define a proper TypeScript interface for props."
        }
      ],
      performance: [
        {
          issue: "Inefficient DOM Queries",
          description: "Querying all '.note' elements on every search is inefficient. Consider using React's virtual DOM with filtered rendering for better performance."
        },
        {
          issue: "Missing Debouncing",
          description: "Search input triggers on every keystroke without debouncing, which could cause performance issues with large datasets."
        }
      ],
      suggestions: [
        {
          issue: "Use React State Management",
          description: "Replace DOM manipulation with React state and filtered rendering. Example: const [filteredNotes, setFilteredNotes] = useState(notes.filter(...))"
        },
        {
          issue: "Add Proper TypeScript Types",
          description: "Define interfaces: interface SearchBarProps { onSearch: (query: string) => void; } and use them throughout the component."
        },
        {
          issue: "Implement Debouncing",
          description: "Add debouncing to the search input using useDebounce hook or lodash.debounce to reduce unnecessary re-renders and API calls."
        },
        {
          issue: "Improve Error Handling",
          description: "Wrap async operations in try-catch blocks and display user-friendly error messages when operations fail."
        }
      ]
    };

    // Simulate processing delay (remove this if you want instant results)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update review with demo results
    await pool.query(
      `UPDATE reviews 
       SET status = 'completed', 
           analysis_result = $1, 
           completed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(demoAnalysis), reviewId]
    );

    console.log(`✅ Review ${reviewId} completed (DEMO MODE)`);
    
  } catch (error) {
    console.error(`❌ Error analyzing review ${reviewId}:`, error);
    
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