import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from '../components/UI';

export default function ShippingPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState(
    JSON.parse(localStorage.getItem('shippingAddress') || '{}')
  );
  const [error, setError] = useState('');

  const submitHandler = (e) => {
    e.preventDefault();
    if (!address.address || !address.city || !address.postalCode || !address.country) {
      setError('Please fill in all fields');
      return;
    }
    localStorage.setItem('shippingAddress', JSON.stringify(address));
    navigate('/payment');
  };

  return (
    <div className="page container checkout-page">
      <div className="checkout-steps">
        <span className="step active">1. Shipping</span>
        <span className="step">2. Payment</span>
        <span className="step">3. Place Order</span>
      </div>

      <div className="card checkout-card">
        <h1>Shipping Address</h1>
        {error && <Message variant="error">{error}</Message>}
        <form onSubmit={submitHandler}>
          <label>
            Address
            <input
              required
              value={address.address || ''}
              onChange={(e) => setAddress({ ...address, address: e.target.value })}
              className="input"
            />
          </label>
          <label>
            City
            <input
              required
              value={address.city || ''}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              className="input"
            />
          </label>
          <label>
            Postal Code
            <input
              required
              value={address.postalCode || ''}
              onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              className="input"
            />
          </label>
          <label>
            Country
            <input
              required
              value={address.country || ''}
              onChange={(e) => setAddress({ ...address, country: e.target.value })}
              className="input"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Continue to Payment
          </button>
        </form>
      </div>
    </div>
  );
}
