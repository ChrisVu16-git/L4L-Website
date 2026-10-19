import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatPrice } from '../utils/api';
import Loader, { Message } from '../components/UI';

export default function AdminPage() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords] = await Promise.all([
        apiFetch('/products'),
        apiFetch('/orders'),
      ]);
      setProducts(prods);
      setOrders(ords);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createProduct = async () => {
    const product = await apiFetch('/products', { method: 'POST' });
    setEditing(product);
    await loadData();
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    await apiFetch(`/products/${editing._id}`, {
      method: 'PUT',
      body: JSON.stringify(editing),
    });
    setEditing(null);
    await loadData();
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const markDelivered = async (id) => {
    await apiFetch(`/orders/${id}/deliver`, { method: 'PUT' });
    await loadData();
  };

  if (loading) return <Loader />;

  return (
    <div className="page container admin-page">
      <h1>Admin Dashboard</h1>
      {error && <Message variant="error">{error}</Message>}

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'products' ? 'tab active' : 'tab'}
          onClick={() => setTab('products')}
        >
          Products
        </button>
        <button
          type="button"
          className={tab === 'orders' ? 'tab active' : 'tab'}
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
      </div>

      {tab === 'products' && (
        <div>
          <button type="button" className="btn btn-primary" onClick={createProduct}>
            + Create Product
          </button>

          {editing && (
            <form onSubmit={saveProduct} className="card admin-edit-form">
              <h2>Edit Product</h2>
              {['name', 'description', 'category', 'image'].map((field) => (
                <label key={field}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <input
                    className="input"
                    value={editing[field]}
                    onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Price
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </label>
              <label>
                Stock
                <input
                  type="number"
                  className="input"
                  value={editing.countInStock}
                  onChange={(e) =>
                    setEditing({ ...editing, countInStock: Number(e.target.value) })
                  }
                />
              </label>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <Link to={`/product/${p._id}`}>{p.name}</Link>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.category}</td>
                    <td>{p.countInStock}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteProduct(p._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
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
                  <td>{order.user?.name}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>{formatPrice(order.totalPrice)}</td>
                  <td>{order.isPaid ? '✓' : '✗'}</td>
                  <td>{order.isDelivered ? '✓' : '✗'}</td>
                  <td>
                    <Link to={`/order/${order._id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                    {!order.isDelivered && order.isPaid && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => markDelivered(order._id)}
                      >
                        Mark Delivered
                      </button>
                    )}
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
