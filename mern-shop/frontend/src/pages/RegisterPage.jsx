import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Message } from '../components/UI';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const [notice, setNotice] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const gmailSuggestion = email && !email.includes('@') && /^[a-zA-Z0-9.]+$/.test(email) ? `${email}@gmail.com` : '';
  const resend = async () => {
    setError(''); setLoading(true);
    try { const data = await apiFetch('/users/resend-verification', { method: 'POST', body: JSON.stringify({ email: pendingEmail }) }); setNotice(data.message); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const submittedEmail = email.trim();
      const data = await register(name, submittedEmail, password);
      if (data.verificationPending) setPendingEmail(submittedEmail);
      setNotice(data.message);
    } catch (err) {
      if (err.verificationPending) setPendingEmail(email.trim());
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container auth-page">
      <div className="auth-card card">
        <h1>{pendingEmail ? 'Check your email' : 'Create Account'}</h1>
        <p>Join the collector’s corner. Confirm your email to finish creating your account.</p>
        {notice && <div role="status"><Message>{notice}</Message></div>}
        {error && <Message variant="error">{error}</Message>}
        {pendingEmail ? <div>
          <p>Confirmation for {pendingEmail}</p>
          <button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={resend}>{loading ? 'Sending…' : 'Resend confirmation'}</button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => { setPendingEmail(''); setNotice(''); setError(''); }} disabled={loading}>Use a different email</button>
        </div> : <form onSubmit={submitHandler}>
          <label>
            Name
            <input
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="yourname@gmail.com"
              list="email-suggestions"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <datalist id="email-suggestions">{gmailSuggestion && <option value={gmailSuggestion} />}</datalist>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <label>
            Confirm Password
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>}
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
