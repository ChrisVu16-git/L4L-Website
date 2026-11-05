import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Message } from '../components/UI';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const submitHandler = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect ? `/${redirect}` : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container auth-page">
      <div className="auth-card card">
        <h1>Đăng nhập</h1>
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
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Mật khẩu
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
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <p className="auth-switch">
          Bạn chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
        </p>

      </div>
    </div>
  );
}
