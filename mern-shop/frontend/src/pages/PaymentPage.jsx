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
          Sandbox payments only — no money is charged. You will be redirected to Stripe’s test checkout. Use test card 4242 4242 4242 4242, a future expiry, and any three-digit CVC.
        </Message>
        <div className="payment-method">
          <label className="radio-label">
            <input type="radio" name="payment" defaultChecked readOnly />
            Stripe sandbox (test card only)
          </label>
        </div>
        <button type="button" className="btn btn-primary" onClick={continueHandler}>
          Continue
        </button>
      </div>
    </div>
  );
}
