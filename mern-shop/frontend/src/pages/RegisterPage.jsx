import { normalizePhone, validAccountPhone } from '../utils/commerce-rules';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Message } from '../components/UI';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const gmailSuggestion = email && !email.includes('@') && /^[a-zA-Z0-9.]+$/.test(email) ? `${email}@gmail.com` : '';

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!validAccountPhone(phone)) { setError('Vui lòng nhập số điện thoại di động hợp lệ.'); return; }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email.trim(), password, normalizePhone(phone));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container auth-page">
      <div className="auth-card card">
        <h1>Tạo tài khoản</h1>
        <p>Tham gia cộng đồng yêu mô hình.</p>
        {error && <Message variant="error">{error}</Message>}
        <form onSubmit={submitHandler}>
          <label>
            Họ và tên
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
            Số điện thoại
            <input className="input" type="tel" autoComplete="tel" placeholder="0912345678" required maxLength={20} value={phone} onChange={event => setPhone(event.target.value)} />
          </label>
          <label>
            Mật khẩu
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
            Nhập lại mật khẩu
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
          </button>
        </form>
        <p className="auth-switch">
          Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
