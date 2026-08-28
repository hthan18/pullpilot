import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, LoadingState, PageHeader, StatusPill } from '../components/ui';
import { authAPI, repoAPI } from '../services/api';
import type { GitHubRepository, Repository, User } from '../types';

type Filter = 'all' | 'connected' | 'available';

export default function Repositories() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<Repository[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userRes, githubRes, connectedRes] = await Promise.all([authAPI.getCurrentUser(), repoAPI.getGitHubRepos(), repoAPI.getConnectedRepos()]);
      setUser(userRes.data as User);
      setGithubRepos(githubRes.data as GitHubRepository[]);
      setConnectedRepos(connectedRes.data as Repository[]);
    } catch (error) { console.error(error); setMessage('Could not load GitHub repositories. Try signing in again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  const activeByGithubId = useMemo(() => new Map(connectedRepos.filter((repo) => repo.is_active).map((repo) => [repo.github_repo_id, repo])), [connectedRepos]);
  const visibleRepos = useMemo(() => githubRepos.filter((repo) => {
    const connected = activeByGithubId.has(repo.github_repo_id);
    const matchesFilter = filter === 'all' || (filter === 'connected' ? connected : !connected);
    const text = `${repo.full_name} ${repo.description || ''}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase());
  }), [githubRepos, activeByGithubId, filter, query]);

  const connect = async (repo: GitHubRepository) => {
    setWorkingId(repo.github_repo_id); setMessage(null);
    try { await repoAPI.connectRepo(repo); await loadData(); setMessage(`${repo.full_name} is now connected.`); }
    catch { setMessage(`Could not connect ${repo.full_name}.`); }
    finally { setWorkingId(null); }
  };
  const disconnect = async (repo: Repository) => {
    if (!window.confirm(`Disconnect ${repo.full_name}? Existing review history will remain saved.`)) return;
    setWorkingId(repo.github_repo_id); setMessage(null);
    try { await repoAPI.disconnectRepo(repo.id); await loadData(); setMessage(`${repo.full_name} was disconnected.`); }
    catch { setMessage(`Could not disconnect ${repo.full_name}.`); }
    finally { setWorkingId(null); }
  };

  if (loading) return <LoadingState label="Syncing GitHub repositories" />;
  return <AppShell user={user}>
    <PageHeader eyebrow="Repository workspace" title="Repositories" description="Choose which GitHub projects PullPilot can analyze and configure their review workflow." />
    {message && <div className="notice" role="status">{message}</div>}
    <div className="toolbar">
      <label className="search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories..." aria-label="Search repositories" /></label>
      <select className="select" value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter repositories"><option value="all">All repositories</option><option value="connected">Connected</option><option value="available">Available</option></select>
      <button className="button" onClick={() => void loadData()}>↻ Sync GitHub</button>
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>{visibleRepos.length} repositories</h2><p>{activeByGithubId.size} connected to PullPilot</p></div><StatusPill status="Live sync" /></div>
      <div className="panel-body">
        {visibleRepos.length === 0 ? <EmptyState title="No matching repositories" description="Try changing the search or connection filter." /> : <div className="repo-grid">{visibleRepos.map((repo) => {
          const connected = activeByGithubId.get(repo.github_repo_id);
          return <article className="repo-card" key={repo.github_repo_id}><div className="repo-card-head"><span className="repo-icon">⌘</span><div className="repo-card-copy"><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><strong>{repo.full_name}</strong>{repo.private && <span className="tag private">Private</span>}{connected && <span className="tag">Connected</span>}</div><p>{repo.description || 'No repository description provided.'}</p></div></div><div className="repo-card-actions">{connected ? <><button className="button primary" onClick={() => navigate(`/repositories/${connected.id}/reviews`)}>Open reviews</button><button className="button danger" disabled={workingId === repo.github_repo_id} onClick={() => void disconnect(connected)}>Disconnect</button></> : <><a className="button" href={repo.url} target="_blank" rel="noreferrer">View GitHub</a><button className="button primary" disabled={workingId === repo.github_repo_id} onClick={() => void connect(repo)}>{workingId === repo.github_repo_id ? 'Connecting…' : 'Connect'}</button></>}</div></article>;
        })}</div>}
      </div>
    </div>
  </AppShell>;
}
