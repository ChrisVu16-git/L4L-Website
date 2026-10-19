import { useNavigate } from 'react-router-dom';
import { Message } from '../components/UI';

export default function PaymentPage() {
  const navigate = useNavigate();
  const shippingAddress = JSON.parse(localStorage.getItem('shippingAddress') || 'null');

  if (!shippingAddress) {
    navigate('/shipping');
    return null;
  }

  const continueHandler = () => {
    navigate('/placeorder');
  };

  return (
    <div className="page container checkout-page">
      <div className="checkout-steps">
        <span className="step done">1. Shipping</span>
        <span className="step active">2. Payment</span>
        <span className="step">3. Place Order</span>
      </div>

      <div className="card checkout-card">
        <h1>Payment Method</h1>
        <Message variant="info">
          Payments are processed securely via Stripe. You will be redirected to complete payment after placing your order.
        </Message>
        <div className="payment-method">
          <label className="radio-label">
            <input type="radio" name="payment" defaultChecked readOnly />
            Stripe (Credit / Debit Card)
          </label>
        </div>
        <button type="button" className="btn btn-primary" onClick={continueHandler}>
          Continue
        </button>
      </div>
    </div>
  );
}
