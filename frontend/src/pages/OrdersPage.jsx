import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatPrice } from '../utils/api';
import Loader, { Message } from '../components/UI';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/orders/myorders')
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="page container">
      <h1>My Orders</h1>
      {error && <Message variant="error">{error}</Message>}
      {orders.length === 0 ? (
        <Message>No orders yet. <Link to="/">Start shopping</Link></Message>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Delivered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{order._id.slice(-8).toUpperCase()}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>{formatPrice(order.totalPrice)}</td>
                  <td>{order.isPaid ? '✓' : '✗'}</td>
                  <td>{order.isDelivered ? '✓' : '✗'}</td>
                  <td>
                    <Link to={`/order/${order._id}`} className="btn btn-ghost btn-sm">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
