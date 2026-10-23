import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiFetch, formatPrice } from '../utils/api';
import { Message } from '../components/UI';

export default function PlaceOrderPage() {
  const { cartItems, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shippingAddress = JSON.parse(localStorage.getItem('shippingAddress') || 'null');
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = subtotal + shipping + tax;

  if (!shippingAddress || cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

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
          paymentMethod: 'stripe',
        }),
      });

      const { url } = await apiFetch(`/orders/${order._id}/checkout`, { method: 'POST' });
      clearCart();
      localStorage.removeItem('shippingAddress');
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="page container checkout-page">
      <div className="checkout-steps">
        <span className="step done">1. Shipping</span>
        <span className="step done">2. Payment</span>
        <span className="step active">3. Place Order</span>
      </div>

      <div className="place-order-layout">
        <div className="card">
          <h2>Shipping</h2>
          <p>
            {shippingAddress.address}, {shippingAddress.city} {shippingAddress.postalCode},{' '}
            {shippingAddress.country}
          </p>
          <h2>Payment</h2>
          <p>Stripe (Card)</p>
          <h2>Items</h2>
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
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {error && <Message variant="error">{error}</Message>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading}
            onClick={placeOrderHandler}
          >
            {loading ? 'Processing...' : 'Pay with Stripe'}
          </button>
        </div>
      </div>
    </div>
  );
}
