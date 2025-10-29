import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Run once: if a token is in URL, store it and go to dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, '', '/'); // remove ?token from URL
      navigate('/dashboard');
    }
  }, [navigate]);

  // Auto-redirect if token already stored
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  // Trigger GitHub login
  const handleGitHubLogin = async () => {
  setLoading(true);
  try {
    const githubUrl = await authAPI.getGitHubAuthUrl();
if (githubUrl) {
  window.location.href = githubUrl;
} else {
  console.error('No GitHub URL returned from backend');
  alert('Login failed: GitHub URL not provided');
  setLoading(false);
}
  } catch (error) {
    console.error('Login error:', error);
    alert('Login error. Check console.');
    setLoading(false);
  }
};

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '450px', width: '100%' }}>
        <div
          style={{
            background: '#1f2937',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #374151',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                background: '#2563eb',
                borderRadius: '50%',
                marginBottom: '16px',
              }}
            >
              <svg
                style={{ width: '32px', height: '32px', color: 'white' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px',
              }}
            >
              PullPilot
            </h1>
            <p style={{ color: '#9ca3af' }}>AI-Powered Code Review Platform</p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            {[
              { title: 'Automated Code Reviews', desc: 'AI analyzes your PRs instantly' },
              { title: 'Security Analysis', desc: 'Catch vulnerabilities early' },
              { title: 'Best Practices', desc: 'Get actionable suggestions' },
            ].map((f) => (
              <div
                key={f.title}
                style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '12px' }}
              >
                <svg
                  style={{
                    width: '20px',
                    height: '20px',
                    color: '#10b981',
                    marginRight: '12px',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '2px' }}>
                    {f.title}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>{f.desc}</p>
                </div>
              </div>
            ))}
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
              transition: 'background 0.2s',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with GitHub'}</span>
          </button>

          <p
            style={{
              color: '#6b7280',
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
