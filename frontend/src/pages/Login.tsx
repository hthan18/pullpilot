import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    authAPI.getCurrentUser().then(() => active && navigate('/dashboard')).catch(() => undefined).finally(() => active && setChecking(false));
    return () => { active = false; };
  }, [navigate]);

  const signIn = () => { setLoading(true); window.location.assign(authAPI.getGitHubLoginUrl()); };
  return <main className="login-page">
    <section className="login-hero">
      <div className="login-brand"><span className="brand-mark">P</span> PullPilot</div>
      <div className="hero-copy"><p className="eyebrow">AI pull request intelligence</p><h1>Ship cleaner code.<br/><span>Review with confidence.</span></h1><p>Turn every pull request into a focused, evidence-backed review with file-level findings and actionable fixes.</p></div>
      <div className="code-preview"><div className="code-top"><span/><span/><span/><em>Review #42</em></div><pre><code><b>security</b>  auth/session.ts:84{`\n`}JWT remains valid after logout{`\n\n`}<i>Suggestion</i>{`\n`}Add token revocation or shorten TTL.</code></pre><div className="confidence-bar"><span>Confidence</span><strong>94%</strong></div></div>
      <p className="login-foot">Structured reviews · GitHub-native workflow · Private by design</p>
    </section>
    <section className="login-panel"><div className="login-card"><p className="eyebrow">Developer workspace</p><h2>Continue to PullPilot</h2><p>Connect your GitHub account to review pull requests across your repositories.</p><button className="github-button" onClick={signIn} disabled={loading || checking}><span>●</span>{loading ? 'Connecting…' : checking ? 'Checking session…' : 'Continue with GitHub'}</button><div className="login-features"><span>✓ Repository-aware review policies</span><span>✓ Encrypted GitHub credentials</span><span>✓ Evidence-validated AI findings</span></div><small>PullPilot requests public repository access so you can explicitly publish completed reviews to a pull request. Publishing is always user initiated.</small></div></section>
  </main>;
}
