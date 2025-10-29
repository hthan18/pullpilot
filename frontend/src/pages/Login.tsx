import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Handle redirect with token
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  // Start GitHub login flow
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.getGitHubAuthUrl();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL returned from backend');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '450px', width: '100%' }}>
        <div style={{
          background: '#1f2937',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #374151'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>PullPilot</h1>
            <p style={{ color: '#9ca3af' }}>AI-Powered Code Review Platform</p>
          </div>

          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: '#111827',
              color: 'white',
              fontWeight: '600',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017..." clipRule="evenodd" />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with GitHub'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
