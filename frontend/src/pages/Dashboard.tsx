import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, repoAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, reposRes] = await Promise.all([
        authAPI.getCurrentUser(),
        repoAPI.getConnectedRepos(),
      ]);
      setUser(userRes.data);
      setRepos(reposRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      localStorage.removeItem('token');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
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
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>PullPilot</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link to="/repositories" style={{ color: '#d1d5db', textDecoration: 'none', padding: '8px 12px', fontSize: '14px' }}>
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
        {/* Welcome Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Welcome back, {user?.username}!
          </h2>
          <p style={{ color: '#9ca3af' }}>Manage your repositories and code reviews</p>
        </div>

        {/* Connected Repositories */}
        <div style={{ background: '#1f2937', borderRadius: '8px', border: '1px solid #374151' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>Connected Repositories</h3>
              <Link
                to="/repositories"
                style={{
                  background: '#2563eb',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Manage Repositories
              </Link>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {repos.filter(r => r.is_active).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: '#9ca3af', marginBottom: '16px' }}>No repositories connected yet</p>
                <Link to="/repositories" style={{ color: '#3b82f6', fontWeight: '500', textDecoration: 'none' }}>
                  Connect your first repository →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {repos.filter(r => r.is_active).map((repo) => (
                  <div key={repo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#111827', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>{repo.full_name}</p>
                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Connected {new Date(repo.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/repositories/${repo.id}/reviews`)}
                      style={{
                        color: '#3b82f6',
                        fontSize: '14px',
                        fontWeight: '500',
                        textDecoration: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      View Reviews →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
