import { totals, validateShipping } from '../../../shared/commerce.mjs';
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiFetch, formatPrice } from '../utils/api';
import { Message } from '../components/UI';

export default function PlaceOrderPage() {
  const { cartItems, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  let shippingAddress;
  try { shippingAddress = JSON.parse(localStorage.getItem('shippingAddress') || 'null'); } catch { shippingAddress = null; }
  const { shippingPrice: shipping, taxPrice: tax, totalPrice: total } = totals(subtotal);

  if (!shippingAddress || cartItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  if (Object.keys(validateShipping(shippingAddress).errors).length) return <Navigate to="/shipping" replace />;

  const placeOrderHandler = async () => {
    setLoading(true);
    setError('');
    try {
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderItems: cartItems.map((item) => ({
            product: item._id,
            name: item.name,
            image: item.image,
            price: item.price,
            qty: item.qty,
          })),
          shippingAddress,
          paymentMethod: 'vnpay',
        }),
      });

      clearCart();
      localStorage.removeItem('shippingAddress');
      navigate(`/order/${order._id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="page container checkout-page">
      <div className="checkout-steps">
        <span className="step done">1. Giao hàng</span>
        <span className="step done">2. Thanh toán</span>
        <span className="step active">3. Đặt hàng</span>
      </div>

      <div className="place-order-layout">
        <div className="card">
          <h2>Thông tin nhận hàng</h2>
          <p>{shippingAddress.recipientName} · {shippingAddress.phone}</p>
          <p>
            {shippingAddress.address}, {shippingAddress.ward}, {shippingAddress.city} {shippingAddress.postalCode},{' '}
            {shippingAddress.country}
          </p>
          <h2>Thanh toán</h2>
          <p>VNPay thử nghiệm (thanh toán bằng VND)</p>
          <h2>Sản phẩm</h2>
          {cartItems.map((item) => (
            <div key={item._id} className="summary-row">
              <span>
                {item.name} x {item.qty}
              </span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="card cart-summary">
          <h2>Chi tiết thanh toán</h2>
          <div className="summary-row">
            <span>Sản phẩm</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Giao hàng</span>
            <span>{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Thuế (10%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Tổng thanh toán</span>
            <span>{formatPrice(total)}</span>
          </div>
          {error && <Message variant="error">{error}</Message>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading}
            onClick={placeOrderHandler}
          >
            {loading ? "Đang xử lý…" : "Đặt hàng thử nghiệm"}
          </button>
        </div>
      </div>
    </div>
  );
}
