import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, repoAPI, reviewAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalIssues, setTotalIssues] = useState(0);

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

      // Fetch total reviews + issues
      const activeRepos = reposRes.data.filter((r: any) => r.is_active);
      let totalReviewsCount = 0;
      let totalIssuesCount = 0;

      for (const repo of activeRepos) {
        try {
          const reviewRes = await reviewAPI.getReviewsByRepo(repo.id);
          const reviews = reviewRes.data || [];
          totalReviewsCount += reviews.length;
          totalIssuesCount += reviews.reduce(
            (acc: number, rev: any) => acc + (rev.issues?.length || 0),
            0
          );
        } catch (err) {
          console.warn(`Failed to load reviews for ${repo.full_name}`);
        }
      }

      setTotalReviews(totalReviewsCount);
      setTotalIssues(totalIssuesCount);
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
      <div
        style={{
          minHeight: '100vh',
          background: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827' }}>
      {/* Navbar */}
      <nav style={{ background: '#1f2937', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              height: '64px',
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
              }}
            >
              PullPilot
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link
                to="/dashboard"
                style={{
                  color:
                    window.location.pathname === '/dashboard'
                      ? 'white'
                      : '#d1d5db',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight:
                    window.location.pathname === '/dashboard' ? '600' : '400',
                }}
              >
                Dashboard
              </Link>

              <Link
                to="/repositories"
                style={{
                  color: window.location.pathname.startsWith('/repositories')
                    ? 'white'
                    : '#d1d5db',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: window.location.pathname.startsWith(
                    '/repositories'
                  )
                    ? '600'
                    : '400',
                }}
              >
                Repositories
              </Link>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <img
                  src={user?.avatar_url}
                  alt={user?.username}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                  }}
                />
                <span style={{ color: '#d1d5db', fontSize: '14px' }}>
                  {user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    color: '#9ca3af',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
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
          <h2
            style={{
              fontSize: '30px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
            }}
          >
            Welcome back, {user?.username}!
          </h2>
          <p style={{ color: '#9ca3af' }}>
            Manage your repositories and code reviews
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {/* Connected Repos */}
          <div
            style={{
              background: '#1f2937',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Connected Repos
                </p>
                <p
                  style={{
                    fontSize: '30px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  {repos.filter((r) => r.is_active).length}
                </p>
              </div>
              <div
                style={{
                  background: '#2563eb',
                  borderRadius: '50%',
                  padding: '12px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '24px', height: '24px', color: 'white' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Reviews */}
          <div
            style={{
              background: '#1f2937',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Total Reviews
                </p>
                <p
                  style={{
                    fontSize: '30px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  {totalReviews}
                </p>
              </div>
              <div
                style={{
                  background: '#10b981',
                  borderRadius: '50%',
                  padding: '12px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '24px', height: '24px', color: 'white' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Issues Found */}
          <div
            style={{
              background: '#1f2937',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Issues Found
                </p>
                <p
                  style={{
                    fontSize: '30px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  {totalIssues}
                </p>
              </div>
              <div
                style={{
                  background: '#f59e0b',
                  borderRadius: '50%',
                  padding: '12px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '24px', height: '24px', color: 'white' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Repositories */}
        <div
          style={{
            background: '#1f2937',
            borderRadius: '8px',
            border: '1px solid #374151',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  margin: 0,
                }}
              >
                Connected Repositories
              </h3>
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
                }}
              >
                Manage Repositories
              </Link>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {repos.filter((r) => r.is_active).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <svg
                  style={{
                    width: '64px',
                    height: '64px',
                    color: '#4b5563',
                    margin: '0 auto 16px',
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
                  No repositories connected yet
                </p>
                <Link
                  to="/repositories"
                  style={{
                    color: '#3b82f6',
                    fontWeight: '500',
                    textDecoration: 'none',
                  }}
                >
                  Connect your first repository →
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {repos
                  .filter((r) => r.is_active)
                  .map((repo) => (
                    <div
                      key={repo.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: '#111827',
                        borderRadius: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            background: '#374151',
                            borderRadius: '50%',
                            padding: '8px',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            style={{
                              width: '20px',
                              height: '20px',
                              color: '#d1d5db',
                            }}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div>
                          <p
                            style={{
                              color: 'white',
                              fontWeight: '500',
                              margin: 0,
                            }}
                          >
                            {repo.full_name}
                          </p>
                          <p
                            style={{
                              color: '#9ca3af',
                              fontSize: '14px',
                              margin: 0,
                            }}
                          >
                            Connected{' '}
                            {new Date(repo.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/repositories/${repo.id}/reviews`}
                        style={{
                          color: '#3b82f6',
                          fontSize: '14px',
                          fontWeight: '500',
                          textDecoration: 'none',
                        }}
                      >
                        View Reviews →
                      </Link>
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
