import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, LoadingState, PageHeader, StatCard, StatusPill } from '../components/ui';
import { authAPI, repoAPI, reviewAPI } from '../services/api';
import type { FindingFeedback, Repository, Review, ReviewCategory, ReviewFinding, ReviewSeverity, StructuredAnalysis, User } from '../types';

const severityOrder: Record<ReviewSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const isStructured = (value: Review['analysis_result']): value is StructuredAnalysis => Boolean(value && Array.isArray((value as StructuredAnalysis).findings));
const feedbackKey = (finding: ReviewFinding) => `${finding.file}:${finding.line ?? 'file'}:${finding.title.trim().toLowerCase()}`;

function markdownFor(review: Review, repository?: Repository) {
  if (!isStructured(review.analysis_result)) return `# PullPilot review\n\nLegacy review for PR #${review.pr_number}.`;
  const analysis = review.analysis_result;
  return [`# PullPilot review: ${review.pr_title}`, '', `**Repository:** ${repository?.full_name || 'Unknown'}`, `**PR:** #${review.pr_number}`, `**Risk:** ${analysis.riskLevel}`, '', analysis.summary, '', '## Findings', '', ...analysis.findings.flatMap((finding) => [`### [${finding.severity.toUpperCase()}] ${finding.title}`, `- **Category:** ${finding.category}`, `- **Location:** \`${finding.file}${finding.line ? `:${finding.line}` : ''}\``, `- **Evidence:** ${finding.evidence}`, `- **Suggested fix:** ${finding.suggestion}`, `- **Confidence:** ${Math.round(finding.confidence * 100)}%`, ''])].join('\n');
}

export default function ReviewPage() {
  const { repoId } = useParams();
  const id = Number(repoId);
  const [user, setUser] = useState<User | null>(null);
  const [repository, setRepository] = useState<Repository>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [prNumber, setPrNumber] = useState('');
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<'all' | ReviewSeverity>('all');
  const [category, setCategory] = useState<'all' | ReviewCategory>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FindingFeedback[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, reviewRes, repoRes] = await Promise.all([authAPI.getCurrentUser(), reviewAPI.getReviewsByRepo(id), repoAPI.getConnectedRepos()]);
      setUser(userRes.data as User);
      setRepository((repoRes.data as Repository[]).find((repo) => String(repo.id) === String(id)));
      const latest = new Map<string, Review>();
      (reviewRes.data as Review[]).forEach((review) => {
        const key = `${review.pr_number}-${review.pr_title.trim()}`;
        const current = latest.get(key);
        if (!current || Date.parse(review.created_at) > Date.parse(current.created_at)) latest.set(key, review);
      });
      const next = [...latest.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      setReviews(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
    } catch (error) { console.error(error); setMessage('Could not load review history.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!reviews.some((review) => review.status === 'pending')) return;
    const interval = window.setInterval(() => void loadData(), 4000);
    return () => window.clearInterval(interval);
  }, [reviews, loadData]);

  const selected = reviews.find((review) => String(review.id) === String(selectedId));
  useEffect(() => {
    if (!selectedId) { setFeedback([]); return; }
    let active = true;
    reviewAPI.getFeedback(selectedId).then((response) => { if (active) setFeedback(response.data as FindingFeedback[]); }).catch(() => { if (active) setFeedback([]); });
    return () => { active = false; };
  }, [selectedId]);
  const selectedAnalysis = selected && isStructured(selected.analysis_result) ? selected.analysis_result : null;
  const findings = useMemo<ReviewFinding[]>(() => selectedAnalysis ? selectedAnalysis.findings.filter((finding) => {
    const text = `${finding.title} ${finding.file} ${finding.description}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (severity === 'all' || finding.severity === severity) && (category === 'all' || finding.category === category);
  }).sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) : [], [selectedAnalysis, query, severity, category]);
  const summary = useMemo(() => reviews.reduce((acc, review) => {
    if (isStructured(review.analysis_result)) review.analysis_result.findings.forEach((finding) => { acc.total += 1; if (finding.severity === 'critical' || finding.severity === 'high') acc.high += 1; });
    if (review.status === 'pending') acc.pending += 1;
    return acc;
  }, { total: 0, high: 0, pending: 0 }), [reviews]);

  const analyze = async () => {
    const number = Number(prNumber);
    if (!Number.isInteger(number) || number < 1) { setMessage('Enter a valid pull request number.'); return; }
    if (reviews.some((review) => review.pr_number === number) && !window.confirm(`Run a fresh analysis for PR #${number}?`)) return;
    setAnalyzing(true); setMessage(null);
    try { const response = await reviewAPI.createReview({ repositoryId: id, prNumber: number }); setSelectedId((response.data as Review).id); setPrNumber(''); await loadData(); setMessage(`PR #${number} is queued for review.`); }
    catch (error) { console.error(error); setMessage('Could not start the review. Confirm that the PR number exists and try again.'); }
    finally { setAnalyzing(false); }
  };
  const copyReview = async () => { if (!selected) return; await navigator.clipboard.writeText(markdownFor(selected, repository)); setMessage('Review copied as Markdown.'); };
  const downloadReview = () => { if (!selected) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([markdownFor(selected, repository)], { type: 'text/markdown' })); link.download = `pullpilot-${repository?.name || 'review'}-pr-${selected.pr_number}.md`; link.click(); URL.revokeObjectURL(link.href); };
  const savePolicy = async () => {
    if (!repository) return;
    setSavingPolicy(true); setMessage(null);
    try {
      const response = await repoAPI.updateSettings(repository.id, {
        review_instructions: repository.review_instructions || '', minimum_confidence: Number(repository.minimum_confidence || 0.65),
        minimum_severity: repository.minimum_severity || 'low', post_to_github: Boolean(repository.post_to_github),
      });
      setRepository(response.data as Repository); setMessage('Review policy saved. New reviews will use these rules.');
    } catch { setMessage('Could not save the review policy.'); }
    finally { setSavingPolicy(false); }
  };
  const publishReview = async () => {
    if (!selected) return;
    setPublishing(true); setMessage(null);
    try {
      const response = await reviewAPI.publish(selected.id);
      const url = (response.data as { github_comment_url: string }).github_comment_url;
      setReviews((current) => current.map((review) => String(review.id) === String(selected.id) ? { ...review, github_comment_url: url } : review));
      setMessage('Review published to the GitHub pull request.');
    } catch { setMessage('GitHub could not accept the comment. Sign out and authorize PullPilot again if repository access was not granted.'); }
    finally { setPublishing(false); }
  };
  const rateFinding = async (finding: ReviewFinding, disposition: 'accepted' | 'dismissed') => {
    if (!selected || !selectedAnalysis) return;
    const index = selectedAnalysis.findings.indexOf(finding);
    try {
      const response = await reviewAPI.saveFeedback(selected.id, index, disposition);
      const saved = response.data as FindingFeedback;
      setFeedback((current) => [...current.filter((item) => item.finding_key !== saved.finding_key), saved]);
      setMessage(disposition === 'accepted' ? 'Finding marked useful.' : 'Finding dismissed as a false positive.');
    } catch { setMessage('Could not save your feedback.'); }
  };

  if (loading) return <LoadingState label="Loading review workspace" />;
  return <AppShell user={user}>
    <PageHeader eyebrow={repository?.full_name || 'Repository'} title="Review workspace" description="Run evidence-backed PR analysis, triage findings, and export results." actions={<>{repository && <a className="button" href={repository.url || `https://github.com/${repository.full_name}`} target="_blank" rel="noreferrer">View GitHub ↗</a>}<Link className="button" to="/repositories">All repositories</Link></>} />
    {message && <div className="notice" role="status">{message}</div>}
    {repository && <details className="policy-panel panel"><summary><span><strong>Repository review policy</strong><small>Teach PullPilot what matters in {repository.name}</small></span><span>Configure</span></summary><div className="policy-grid"><label className="field wide"><span>Repository-specific instructions</span><textarea rows={4} value={repository.review_instructions || ''} maxLength={4000} onChange={(event) => setRepository({ ...repository, review_instructions: event.target.value })} placeholder="Examples: Authentication changes require tests. API handlers must validate request bodies. Database changes require migrations." /><small>These rules are passed into every new review.</small></label><label className="field"><span>Minimum confidence</span><select className="select" value={String(repository.minimum_confidence || 0.65)} onChange={(event) => setRepository({ ...repository, minimum_confidence: Number(event.target.value) })}><option value="0.5">50% · Exploratory</option><option value="0.65">65% · Balanced</option><option value="0.8">80% · Strict</option><option value="0.9">90% · Very strict</option></select></label><label className="field"><span>Minimum severity</span><select className="select" value={repository.minimum_severity || 'low'} onChange={(event) => setRepository({ ...repository, minimum_severity: event.target.value as ReviewSeverity })}><option value="low">Low and above</option><option value="medium">Medium and above</option><option value="high">High and critical</option><option value="critical">Critical only</option></select></label><div className="policy-footer"><p>Findings are checked against changed files and changed lines before display.</p><button className="button primary" disabled={savingPolicy} onClick={() => void savePolicy()}>{savingPolicy ? 'Saving…' : 'Save policy'}</button></div></div></details>}
    <section className="stats-grid review-stats"><StatCard label="Reviews" value={reviews.length} detail="Unique pull requests" tone="blue" /><StatCard label="Findings" value={summary.total} detail="Across current reviews" tone="violet" /><StatCard label="High priority" value={summary.high} detail="Critical or high severity" tone="amber" /><StatCard label="In progress" value={summary.pending} detail="Actively analyzing" tone="green" /></section>
    <section className="review-layout">
      <aside className="review-rail panel">
        <div className="panel-header"><div><h2>Review history</h2><p>{reviews.length} pull requests</p></div></div>
        <div className="new-review"><label>Pull request number</label><div><input type="number" min="1" value={prNumber} onChange={(event) => setPrNumber(event.target.value)} placeholder="e.g. 42" onKeyDown={(event) => event.key === 'Enter' && void analyze()} /><button className="button primary" disabled={analyzing || !prNumber} onClick={() => void analyze()}>{analyzing ? '…' : 'Run'}</button></div></div>
        <div className="review-list">{reviews.length === 0 ? <EmptyState title="No reviews yet" description="Enter a pull request number to run the first review." /> : reviews.map((review) => {
          const analysis = isStructured(review.analysis_result) ? review.analysis_result : null;
          return <button key={review.id} className={`review-list-item ${selectedId === review.id ? 'selected' : ''}`} onClick={() => setSelectedId(review.id)}><span className="review-number">#{review.pr_number}</span><span className="review-list-copy"><strong>{review.pr_title}</strong><small>{new Date(review.created_at).toLocaleString()}</small><span><StatusPill status={review.model ? (analysis?.riskLevel || review.status) : review.status} />{!review.model && review.status === 'completed' && <em>Legacy</em>}</span></span></button>;
        })}</div>
      </aside>
      <div className="review-detail panel">
        {!selected ? <EmptyState title="Select a review" description="Choose a pull request from the history to inspect its findings." /> : <>
          <div className="review-detail-head"><div><div className="review-title-line"><span>PR #{selected.pr_number}</span><StatusPill status={selected.status} /></div><h2>{selected.pr_title}</h2><p>{repository?.full_name}</p></div><div className="review-actions"><button className="button small" onClick={() => void copyReview()}>Copy Markdown</button><button className="button small" onClick={downloadReview}>Export</button>{selected.github_comment_url ? <a className="button small success" href={selected.github_comment_url} target="_blank" rel="noreferrer">Published ↗</a> : selected.status === 'completed' && <button className="button small primary" disabled={publishing} onClick={() => void publishReview()}>{publishing ? 'Publishing…' : 'Publish to GitHub'}</button>}{repository && <a className="button small" href={`https://github.com/${repository.full_name}/pull/${selected.pr_number}`} target="_blank" rel="noreferrer">Open PR ↗</a>}</div></div>
          {selected.status === 'pending' ? <LoadingState label="AI is reviewing changed files" /> : selected.status === 'failed' ? <EmptyState icon="!" title="Review failed" description={selected.error_message || 'Try running this review again.'} /> : !isStructured(selected.analysis_result) ? <div className="legacy-review"><StatusPill status="Legacy demo" /><h3>This is a pre-AI demo result</h3><p>Run this PR again to replace the stored mock findings with an evidence-backed review.</p><button className="button primary" onClick={() => { setPrNumber(String(selected.pr_number)); }}>Prepare reanalysis</button></div> : <StructuredReview review={selected} repository={repository} findings={findings} feedback={feedback} onRate={rateFinding} query={query} setQuery={setQuery} severity={severity} setSeverity={setSeverity} category={category} setCategory={setCategory} />}
        </>}
      </div>
    </section>
  </AppShell>;
}

function StructuredReview({ review, repository, findings, feedback, onRate, query, setQuery, severity, setSeverity, category, setCategory }: { review: Review; repository?: Repository; findings: ReviewFinding[]; feedback: FindingFeedback[]; onRate: (finding: ReviewFinding, disposition: 'accepted' | 'dismissed') => Promise<void>; query: string; setQuery: (value: string) => void; severity: 'all' | ReviewSeverity; setSeverity: (value: 'all' | ReviewSeverity) => void; category: 'all' | ReviewCategory; setCategory: (value: 'all' | ReviewCategory) => void }) {
  const analysis = review.analysis_result as StructuredAnalysis;
  const feedbackByKey = new Map(feedback.map((item) => [item.finding_key, item.disposition]));
  return <div className="structured-review">
    <div className="review-summary"><div><StatusPill status={`${analysis.riskLevel} risk`} /><h3>{analysis.summary}</h3>{analysis.metadata?.validation && <p className="validation-note">✓ {analysis.metadata.validation.accepted} evidence-backed findings shown · {analysis.metadata.validation.rejected} unsupported or below-policy findings filtered</p>}</div><dl><div><dt>Model</dt><dd>{review.model}</dd></div><div><dt>Files</dt><dd>{review.files_reviewed || 0} reviewed · {review.files_skipped || 0} skipped</dd></div><div><dt>Tokens</dt><dd>{((review.input_tokens || 0) + (review.output_tokens || 0)).toLocaleString()}</dd></div></dl></div>
    <div className="finding-toolbar"><label className="search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search findings or files..." /></label><select className="select" value={severity} onChange={(event) => setSeverity(event.target.value as 'all' | ReviewSeverity)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select className="select" value={category} onChange={(event) => setCategory(event.target.value as 'all' | ReviewCategory)}><option value="all">All categories</option><option value="security">Security</option><option value="correctness">Correctness</option><option value="reliability">Reliability</option><option value="performance">Performance</option><option value="maintainability">Maintainability</option></select></div>
    <div className="findings-head"><h3>{findings.length} findings</h3><span>Sorted by severity</span></div>
    {findings.length === 0 ? <EmptyState icon="✓" title="No matching findings" description="Adjust the filters or search term." /> : <div className="finding-list">{findings.map((finding, index) => { const disposition = feedbackByKey.get(feedbackKey(finding)); return <article className={`finding-card severity-${finding.severity} ${disposition === 'dismissed' ? 'dismissed' : ''}`} key={`${finding.file}-${finding.line}-${index}`}><div className="finding-top"><div><StatusPill status={finding.severity} /><span className="category-label">{finding.category}</span></div><span className="confidence">{Math.round(finding.confidence * 100)}% confidence</span></div><h3>{finding.title}</h3>{repository ? <a className="file-link" href={`https://github.com/${repository.full_name}/pull/${review.pr_number}/files`} target="_blank" rel="noreferrer">{finding.file}{finding.line ? `:${finding.line}` : ''} ↗</a> : <span className="file-link">{finding.file}{finding.line ? `:${finding.line}` : ''}</span>}<p>{finding.description}</p><details><summary>Evidence and suggested fix</summary><div className="evidence-grid"><div><span>Evidence</span><p>{finding.evidence}</p></div><div><span>Suggested fix</span><p>{finding.suggestion}</p></div></div></details><div className="finding-feedback"><span>Was this useful?</span><button className={disposition === 'accepted' ? 'active' : ''} aria-pressed={disposition === 'accepted'} onClick={() => void onRate(finding, 'accepted')}>✓ Useful</button><button className={disposition === 'dismissed' ? 'active danger' : ''} aria-pressed={disposition === 'dismissed'} onClick={() => void onRate(finding, 'dismissed')}>× False positive</button></div></article>; })}</div>}
  </div>;
}
