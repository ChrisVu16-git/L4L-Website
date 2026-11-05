import { useNavigate, Navigate } from 'react-router-dom';
import { validateShipping } from '../../../shared/commerce.mjs';
import { Message } from '../components/UI';
export default function PaymentPage() {
  const navigate = useNavigate();
  let address;
  try { address = JSON.parse(localStorage.getItem('shippingAddress') || 'null'); } catch { address = null; }
  if (Object.keys(validateShipping(address).errors).length) return <Navigate to="/shipping" replace />;
  return <div className="page container checkout-page"><div className="checkout-steps"><span className="step done">1. Giao hàng</span><span className="step active">2. Thanh toán</span><span className="step">3. Đặt hàng</span></div>
    <div className="card checkout-card"><h1>Phương thức thanh toán</h1><Message>Thanh toán VNPay đang ở chế độ thử nghiệm. Chỉ sử dụng thông tin ngân hàng thử nghiệm của VNPay, không dùng thẻ thật.</Message>
      <label className="radio-label"><input type="radio" name="payment" checked readOnly />VNPay thử nghiệm</label>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/placeorder')}>Kiểm tra đơn hàng</button>
    </div>
  </div>;
}
