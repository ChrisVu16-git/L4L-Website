import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validateShipping } from '../utils/commerce-rules';
import { useAuth } from '../context/AuthContext';
import ShippingFields from '../components/ShippingFields';
export default function ShippingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [address, setAddress] = useState(() => {
    try { return { country: 'Việt Nam', recipientName: user?.name || '', phone: user?.phone || '', ...JSON.parse(localStorage.getItem('shippingAddress') || '{}') }; }
    catch { return { country: 'Việt Nam' }; }
  });
  const [errors, setErrors] = useState({});
  useEffect(() => { if (user) setAddress(current => ({ ...current, recipientName: current.recipientName || user.name || '', phone: current.phone || user.phone || '' })); }, [user]);
  const submit = event => {
    event.preventDefault();
    const checked = validateShipping(address); setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    localStorage.setItem('shippingAddress', JSON.stringify(checked.value));
    navigate('/payment');
  };
  return <div className="page container checkout-page">
    <div className="checkout-steps"><span className="step active">1. Giao hàng</span><span className="step">2. Thanh toán</span><span className="step">3. Đặt hàng</span></div>
    <div className="card checkout-card"><h1>Thông tin giao hàng</h1>
      {!user && <p>Bạn có thể đặt hàng không cần tài khoản. <Link to="/login?redirect=shipping">Đăng nhập</Link> nếu muốn lưu đơn trong tài khoản.</p>}
      <form onSubmit={submit} noValidate><ShippingFields value={address} onChange={setAddress} errors={errors} />
        <button className="btn btn-primary" type="submit">Tiếp tục thanh toán</button>
      </form>
    </div>
  </div>;
}
