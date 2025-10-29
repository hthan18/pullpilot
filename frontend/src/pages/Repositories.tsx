import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, repoAPI } from '../services/api';

export default function Repositories() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, githubRes, connectedRes] = await Promise.all([
        authAPI.getCurrentUser(),
        repoAPI.getGitHubRepos(),
        repoAPI.getConnectedRepos(),
      ]);
      setUser(userRes.data);
      setGithubRepos(githubRes.data);
      setConnectedRepos(connectedRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (repo: any) => {
    setConnecting(repo.github_repo_id);
    try {
      await repoAPI.connectRepo({
        github_repo_id: repo.github_repo_id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner,
      });
      await loadData();
    } catch (error) {
      console.error('Error connecting repo:', error);
      alert('Failed to connect repository');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (repoId: number) => {
    if (!confirm('Are you sure you want to disconnect this repository?')) {
      return;
    }
    try {
      await repoAPI.disconnectRepo(repoId);
      await loadData();
    } catch (error) {
      console.error('Error disconnecting repo:', error);
      alert('Failed to disconnect repository');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const isConnected = (githubRepoId: string) => {
    return connectedRepos.some(
      (r) => r.github_repo_id === githubRepoId && r.is_active
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827' }}>
      {/* Navbar */}
      <nav style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: '64px', alignItems: 'center' }}>
            <Link to="/dashboard" style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>
              PullPilot
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link to="/dashboard" style={{ color: '#d1d5db', textDecoration: 'none', padding: '8px 12px', fontSize: '14px' }}>
                Dashboard
              </Link>
              <Link to="/repositories" style={{ color: 'white', textDecoration: 'none', padding: '8px 12px', fontSize: '14px', background: '#374151', borderRadius: '6px' }}>
                Repositories
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={user?.avatar_url} alt={user?.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <span style={{ color: '#d1d5db', fontSize: '14px' }}>{user?.username}</span>
                <button onClick={handleLogout} style={{ color: '#9ca3af', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Manage Repositories
          </h2>
          <p style={{ color: '#9ca3af' }}>
            Connect repositories to enable AI-powered code reviews
          </p>
        </div>

        {/* Connected Repositories */}
        {connectedRepos.filter((r) => r.is_active).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
              Connected Repositories ({connectedRepos.filter((r) => r.is_active).length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '16px' }}>
              {connectedRepos
                .filter((r) => r.is_active)
                .map((repo) => (
                  <div
                    key={repo.id}
                    style={{ background: '#1f2937', borderRadius: '8px', padding: '24px', border: '1px solid #374151' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#10b981', borderRadius: '50%', padding: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ color: 'white', fontWeight: '500', margin: 0, marginBottom: '4px' }}>{repo.full_name}</p>
                          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                            Connected {new Date(repo.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/repositories/${repo.id}/reviews`)}
                        style={{
                          flex: 1,
                          background: '#2563eb',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        View Reviews
                      </button>
                      <button
                        onClick={() => handleDisconnect(repo.id)}
                        style={{
                          background: '#dc2626',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Available GitHub Repositories */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
            Your GitHub Repositories
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '16px' }}>
            {githubRepos.map((repo) => {
              const connected = isConnected(repo.github_repo_id);
              return (
                <div
                  key={repo.github_repo_id}
                  style={{ background: '#1f2937', borderRadius: '8px', padding: '24px', border: '1px solid #374151' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ background: '#374151', borderRadius: '50%', padding: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg style={{ width: '20px', height: '20px', color: '#d1d5db' }} fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: 'white', fontWeight: '500', margin: 0, marginBottom: '4px' }}>{repo.full_name}</p>
                        <p style={{color: '#9ca3af', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxWidth: '100%',}}>
                          {repo.description || 'No description'}
                          </p>
                      </div>
                    </div>
                    {repo.private && (
                      <span style={{ background: '#374151', color: '#d1d5db', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', flexShrink: 0, marginLeft: '8px' }}>
                        Private
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleConnect(repo)}
                    disabled={connected || connecting === repo.github_repo_id}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: connected ? 'not-allowed' : 'pointer',
                      background: connected ? '#374151' : '#2563eb',
                      color: connected ? '#9ca3af' : 'white',
                      opacity: connected ? 0.6 : 1
                    }}
                  >
                    {connecting === repo.github_repo_id
                      ? 'Connecting...'
                      : connected
                      ? 'Connected'
                      : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}