import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, LoadingState, PageHeader, StatCard, StatusPill } from '../components/ui';
import { authAPI, repoAPI, reviewAPI } from '../services/api';
import type { Repository, Review, ReviewAnalytics, StructuredAnalysis, User } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reviews, setReviews] = useState<Array<Review & { repositoryName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<ReviewAnalytics | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userRes, reposRes, analyticsRes] = await Promise.all([authAPI.getCurrentUser(), repoAPI.getConnectedRepos(), reviewAPI.getAnalytics()]);
      const connected = (reposRes.data as Repository[]).filter((repo) => repo.is_active);
      setUser(userRes.data as User);
      setRepos(connected);
      setQuality(analyticsRes.data as ReviewAnalytics);
      const reviewGroups = await Promise.all(connected.map(async (repo) => {
        try {
          const response = await reviewAPI.getReviewsByRepo(repo.id);
          return (response.data as Review[]).map((review) => ({ ...review, repositoryName: repo.full_name }));
        } catch { return []; }
      }));
      setReviews(reviewGroups.flat().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
    } catch (error) {
      console.error('Unable to load dashboard', error);
      navigate('/');
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { void loadData(); }, [loadData]);

  const stats = useMemo(() => {
    let findings = 0;
    let highRisk = 0;
    let tokens = 0;
    reviews.forEach((review) => {
      const analysis = review.analysis_result as StructuredAnalysis | null;
      findings += Array.isArray(analysis?.findings) ? analysis.findings.length : 0;
      highRisk += analysis?.riskLevel === 'high' ? 1 : 0;
      tokens += (review.input_tokens || 0) + (review.output_tokens || 0);
    });
    return { findings, highRisk, tokens };
  }, [reviews]);

  if (loading) return <LoadingState />;

  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Workspace overview" title={`Welcome back, ${user?.username || 'developer'}`} description="Monitor connected repositories, review activity, and code health in one place." actions={<Link className="button primary" to="/repositories">＋ Connect repository</Link>} />
      <section className="stats-grid">
        <StatCard label="Connected repos" value={repos.length} detail="Actively monitored" tone="blue" />
        <StatCard label="AI reviews" value={reviews.length} detail="Across all repositories" tone="green" />
        <StatCard label="Findings" value={stats.findings} detail={`${stats.highRisk} high-risk reviews`} tone="amber" />
        <StatCard label="Acceptance rate" value={quality?.acceptance_rate === null || quality?.acceptance_rate === undefined ? '—' : `${quality.acceptance_rate}%`} detail={quality?.rated_findings ? `${quality.rated_findings} rated findings` : 'Rate findings to measure quality'} tone="violet" />
      </section>
      <section className="split-grid">
        <div className="panel">
          <div className="panel-header"><div><h2>Connected repositories</h2><p>Jump into a repository to run or inspect reviews.</p></div><Link to="/repositories" className="text-button">Manage all →</Link></div>
          {repos.length === 0 ? <EmptyState title="No repositories connected" description="Connect a GitHub repository to begin reviewing pull requests." action={<Link className="button primary" to="/repositories">Connect repository</Link>} /> : <div className="repo-list">{repos.slice(0, 6).map((repo) => {
            const count = reviews.filter((review) => String(review.repository_id) === String(repo.id)).length;
            return <Link key={repo.id} to={`/repositories/${repo.id}/reviews`} className="repo-row"><span className="repo-icon">⌘</span><span className="repo-copy"><strong>{repo.full_name}</strong><span>Connected {new Date(repo.created_at).toLocaleDateString()}</span></span><span className="row-meta"><strong>{count} reviews</strong><span>Open workspace →</span></span></Link>;
          })}</div>}
        </div>
        <div className="panel">
          <div className="panel-header"><div><h2>Recent activity</h2><p>Latest review runs.</p></div></div>
          <div className="panel-body">{reviews.length === 0 ? <EmptyState title="No review activity" description="Your latest AI reviews will appear here." /> : <div className="activity-list">{reviews.slice(0, 7).map((review) => <div className="activity-item" key={review.id}><span className="activity-dot" /><div><strong>PR #{review.pr_number} · {review.pr_title}</strong><span>{review.repositoryName} · {new Date(review.created_at).toLocaleString()}</span><div style={{marginTop:6}}><StatusPill status={review.status} /></div></div></div>)}</div>}</div>
        </div>
      </section>
    </AppShell>
  );
}
