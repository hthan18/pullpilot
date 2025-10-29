import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div style={{ color: 'white', textAlign: 'center', marginTop: '40px' }}>
      Redirecting...
    </div>
  );
}
