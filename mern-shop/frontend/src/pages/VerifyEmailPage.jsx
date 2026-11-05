import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Message } from '../components/UI';

export default function VerifyEmailPage() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/users/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
      setNotice(data.message); setParams({}, { replace: true });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <div className="page container auth-page"><div className="auth-card card">
    <h1>Confirm your email</h1>
    <p>One last step before your next shelf favourite.</p>
    {notice && <div role="status"><Message variant="success">{notice}</Message></div>}
    {error && <Message variant="error">{error}</Message>}
    {!notice && <button className="btn btn-primary btn-block" disabled={loading || !token} onClick={confirm}>{loading ? 'Confirming…' : 'Confirm email'}</button>}
    <p><Link to="/login">Sign in</Link> · <Link to="/register">Request a new confirmation</Link></p>
  </div></div>;
}
