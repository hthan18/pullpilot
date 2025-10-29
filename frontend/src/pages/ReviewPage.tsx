import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authAPI, reviewAPI } from '../services/api';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { repoId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [prNumber, setPrNumber] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [repoId]);

  const loadData = async () => {
  try {
    const [userRes, reviewsRes] = await Promise.all([
      authAPI.getCurrentUser(),
      reviewAPI.getReviewsByRepo(Number(repoId)),
    ]);

    setUser(userRes.data);

    const uniqueReviews = Object.values(
      reviewsRes.data.reduce((acc: any, review: any) => {
        const existing = acc[review.pr_number];
        if (!existing || new Date(review.created_at) > new Date(existing.created_at)) {
          acc[review.pr_number] = review;
        }
        return acc;
      }, {})
    );

    // ✅ Sort newest first
    uniqueReviews.sort((a: any, b: any) => new Date(b.created_at) - new Date(a.created_at));

    setReviews(uniqueReviews);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
};

  const handleAnalyze = async () => {
    if (!prNumber) {
      alert('Please enter a PR number');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await reviewAPI.createReview({
        repositoryId: Number(repoId),
        prNumber: Number(prNumber),
      });
      setPrNumber('');
      await loadData();
      setSelectedReview(response.data);
    } catch (error: any) {
      console.error('Error creating review:', error);
      if (error.response?.status === 404) {
        alert('Pull request not found. Make sure the PR number is correct.');
      } else {
        alert('Failed to create review');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const renderAnalysis = (review: any) => {
    if (review.status === 'pending') {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #374151',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
          <p style={{ color: '#9ca3af' }}>AI is analyzing the code... This may take 30-60 seconds.</p>
        </div>
      );
    }

    if (review.status === 'failed') {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>Analysis failed. Please try again.</p>
        </div>
      );
    }

    if (!review.analysis_result) {
      return null;
    }

    const analysis = typeof review.analysis_result === 'string' 
      ? JSON.parse(review.analysis_result) 
      : review.analysis_result;

    return (
      <div style={{ padding: '24px' }}>
        {analysis.security && analysis.security.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>🔴</span> Security Issues
            </h4>
            {analysis.security.map((item: any, idx: number) => (
              <div key={idx} style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #ef4444' }}>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>{item.issue}</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.quality && analysis.quality.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f59e0b' }}>🟡</span> Code Quality
            </h4>
            {analysis.quality.map((item: any, idx: number) => (
              <div key={idx} style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #f59e0b' }}>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>{item.issue}</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.bestPractices && analysis.bestPractices.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3b82f6' }}>🔵</span> Best Practices
            </h4>
            {analysis.bestPractices.map((item: any, idx: number) => (
              <div key={idx} style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #3b82f6' }}>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>{item.issue}</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>💡</span> Suggestions
            </h4>
            {analysis.suggestions.map((item: any, idx: number) => (
              <div key={idx} style={{ background: '#1f2937', padding: '12px', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #10b981' }}>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>{item.issue}</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.rawAnalysis && (
          <div>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Analysis</h4>
            <div style={{ background: '#1f2937', padding: '16px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
              <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0 }}>{analysis.rawAnalysis}</p>
            </div>
          </div>
        )}
      </div>
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
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

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
        <div style={{ marginBottom: '32px' }}>
          <Link to="/repositories" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', marginBottom: '8px', display: 'inline-block' }}>
            ← Back to Repositories
          </Link>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Code Reviews
          </h2>
          <p style={{ color: '#9ca3af' }}>
            Analyze pull requests with AI-powered code review
          </p>
        </div>

        {/* Analyze New PR */}
        <div style={{ background: '#1f2937', borderRadius: '8px', padding: '24px', border: '1px solid #374151', marginBottom: '32px' }}>
          <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Analyze New Pull Request
          </h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="number"
              placeholder="Enter PR number (e.g., 42)"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !prNumber}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: analyzing || !prNumber ? 'not-allowed' : 'pointer',
                opacity: analyzing || !prNumber ? 0.5 : 1
              }}
            >
              {analyzing ? 'Analyzing...' : 'Analyze PR'}
            </button>
          </div>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', margin: 0 }}>
            Enter the pull request number from GitHub to analyze
          </p>
        </div>

        {/* Reviews List */}
        <div>
          <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Review History
          </h3>
          {reviews.length === 0 ? (
            <div style={{ background: '#1f2937', borderRadius: '8px', padding: '48px', border: '1px solid #374151', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', marginBottom: '8px' }}>No reviews yet</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Analyze your first pull request to see AI-powered insights</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map((review) => (
                <div key={review.id} style={{ background: '#1f2937', borderRadius: '8px', border: '1px solid #374151', overflow: 'hidden' }}>
                  <div
                    onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
                    style={{
                      padding: '20px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '500', margin: 0 }}>
                          PR #{review.pr_number}: {review.pr_title}
                        </h4>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: review.status === 'completed' ? '#10b981' : review.status === 'failed' ? '#ef4444' : '#f59e0b',
                          color: 'white'
                        }}>
                          {review.status}
                        </span>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                        {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>
                    <svg
                      style={{
                        width: '20px',
                        height: '20px',
                        color: '#9ca3af',
                        transform: selectedReview?.id === review.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {selectedReview?.id === review.id && (
                    <div style={{ borderTop: '1px solid #374151' }}>
                      {renderAnalysis(review)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}