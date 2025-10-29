import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json([]);
});


router.get('/repository/:repoId', (req, res) => {
  const { repoId } = req.params;
  res.json({ repoId, issues: [] });
});

export default router;
