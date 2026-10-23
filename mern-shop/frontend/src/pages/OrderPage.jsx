import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, formatPrice } from '../utils/api';
import Loader, { Message } from '../components/UI';

export default function OrderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        let data = await apiFetch(`/orders/${id}`);

        if (success && !data.isPaid) {
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const status = await apiFetch(`/orders/${id}/pay`);
            if (status.isPaid) {
              data = await apiFetch(`/orders/${id}`);
              break;
            }
          }
        }

        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, success]);

  if (loading) return <Loader />;
  if (error) return <Message variant="error">{error}</Message>;
  if (!order) return null;

  return (
    <div className="page container order-page">
      <h1>Order {order._id.slice(-8).toUpperCase()}</h1>

      {success && order.isPaid && (
        <Message variant="success">Payment successful! Thank you for your order.</Message>
      )}
      {cancelled && <Message variant="error">Payment was cancelled.</Message>}

      <div className="order-grid">
        <div className="card">
          <h2>Shipping</h2>
          <p>
            <strong>{order.user.name}</strong>
          </p>
          <p>
            {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
            {order.shippingAddress.postalCode}, {order.shippingAddress.country}
          </p>
          {order.isDelivered ? (
            <Message variant="success">Delivered on {new Date(order.deliveredAt).toLocaleDateString()}</Message>
          ) : (
            <Message variant="info">Not delivered yet</Message>
          )}
        </div>

        <div className="card">
          <h2>Payment</h2>
          <p>Method: {order.paymentMethod}</p>
          {order.isPaid ? (
            <Message variant="success">Paid on {new Date(order.paidAt).toLocaleDateString()}</Message>
          ) : (
            <Message variant="error">Not paid</Message>
          )}
        </div>

        <div className="card order-items-card">
          <h2>Order Items</h2>
          {order.orderItems.map((item) => (
            <div key={item.product} className="order-item">
              <img src={item.image} alt={item.name} />
              <div>
                <Link to={`/product/${item.product}`}>{item.name}</Link>
                <p>
                  {item.qty} x {formatPrice(item.price)} = {formatPrice(item.qty * item.price)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="card cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <span>{formatPrice(order.itemsPrice)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingPrice)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatPrice(order.taxPrice)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatPrice(order.totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
