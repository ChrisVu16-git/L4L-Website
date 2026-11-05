import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Message } from '../components/UI';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [notice, setNotice] = useState('');
  const resend = async () => {
    setLoading(true); setError(''); setNotice('');
    try { const data = await apiFetch('/users/resend-verification', { method: 'POST', body: JSON.stringify({ email: pendingEmail }) }); setNotice(data.message); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const submitHandler = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setPendingEmail('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect ? `/${redirect}` : '/');
    } catch (err) {
      if (err.code === 'EMAIL_UNVERIFIED') setPendingEmail(email.trim());
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container auth-page">
      <div className="auth-card card">
        <h1>Sign In</h1>
        {notice && <div role="status"><Message>{notice}</Message></div>}
        {error && <Message variant="error">{error}</Message>}
        <form onSubmit={submitHandler}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setPendingEmail(''); setNotice(''); }}
              className="input"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              maxLength={72}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {pendingEmail && <button className="btn btn-ghost btn-block" type="button" disabled={loading} onClick={resend}>Resend confirmation</button>}
        <p className="auth-switch">
          New customer? <Link to="/register">Create an account</Link>
        </p>

      </div>
    </div>
  );
}
