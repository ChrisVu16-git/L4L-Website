import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateShipping } from '../utils/commerce-rules';
import ShippingFields from '../components/ShippingFields';
export default function ShippingPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState(() => {
    try { return { country: 'Việt Nam', ...JSON.parse(localStorage.getItem('shippingAddress') || '{}') }; }
    catch { return { country: 'Việt Nam' }; }
  });
  const [errors, setErrors] = useState({});
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
      <form onSubmit={submit} noValidate><ShippingFields value={address} onChange={setAddress} errors={errors} />
        <button className="btn btn-primary" type="submit">Tiếp tục thanh toán</button>
      </form>
    </div>
  </div>;
}
