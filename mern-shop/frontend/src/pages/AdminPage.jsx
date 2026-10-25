import { useState, useEffect, useRef } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [prods, ords] = await Promise.all([
        apiFetch('/products'),
        apiFetch('/orders'),
      ]);

      setProducts(prods);
      setOrders(ords);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createProduct = () => {
    setUploadError('');
    setEditing({
      name: '',
      description: '',
      category: '',
      image: '',
      imagePublicId: '',
      price: 0,
      countInStock: 0,
    });
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = '';

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Choose a JPG, PNG, WebP, or AVIF image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await apiFetch('/uploads/image', {
        method: 'POST',
        body: formData,
      });

      if (!result.imageUrl || !result.publicId) {
        throw new Error('Upload succeeded, but the image URL or public ID was missing.');
      }
      setEditing((current) =>
        current ? {
          ...current,
          image: result.imageUrl,
          imagePublicId: result.publicId } :
        current
      );
    } catch (err) {
      setUploadError(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    if (uploading) {
      alert('Please wait for the image upload to finish.');
      return;
    }

    try {
      const isEditing = Boolean(editing._id);

      await apiFetch(
        isEditing ? `/products/${editing._id}` : '/products',
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify(editing),
        }
      );

      setEditing(null);
      setUploadError('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const markDelivered = async (id) => {
    try {
      await apiFetch(`/orders/${id}/deliver`, { method: 'PUT' });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update order');
    }
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={createProduct}
          >
            + Create Product
          </button>

          {editing && (
            <form onSubmit={saveProduct} className="card admin-edit-form">
              <h2>{editing._id ? 'Edit Product' : 'Create Product'}</h2>

              {['name', 'description', 'category'].map((field) => (
                <label key={field}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  <input
                    className="input"
                    required
                    value={editing[field] ?? ''}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        [field]: event.target.value,
                      })
                    }
                  />
                </label>
              ))}

              <label>
                Product Image
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="input"
                  onChange={uploadImage}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading image...' : 'Upload Image to Cloudinary'}
              </button>

              {uploadError && (
                <p role="alert" className="error">
                  {uploadError}
                </p>
              )}

              {editing.image && (
                <div className="image-preview">
                  <p>Image preview</p>
                  <img
                    src={editing.image}
                    alt={editing.name || 'Product preview'}
                    style={{
                      display: 'block',
                      width: '180px',
                      maxHeight: '180px',
                      objectFit: 'contain',
                      marginBottom: '12px',
                    }}
                  />

                  <label>
                    Image URL
                    <input
                      className="input"
                      type="url"
                      value={editing.image}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          image: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              )}

              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="input"
                  value={editing.price}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      price: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="input"
                  value={editing.countInStock}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      countInStock: Number(event.target.value),
                    })
                  }
                />
              </label>

              <div className="btn-row">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {editing._id ? 'Save Changes' : 'Create Product'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditing(null);
                    setUploadError('');
                  }}
                >
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
                  <th>Image</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <Link to={`/product/${product._id}`}>
                        {product.name}
                      </Link>
                    </td>
                    <td>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'contain',
                          }}
                        />
                      )}
                    </td>
                    <td>{formatPrice(product.price)}</td>
                    <td>{product.category}</td>
                    <td>{product.countInStock}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setUploadError('');
                          setEditing({
                            ...product,
                            image: product.image || '',
                          });
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteProduct(product._id)}
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
                    <Link
                      to={`/order/${order._id}`}
                      className="btn btn-ghost btn-sm"
                    >
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
