import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, formatPrice } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Loader, { Message, Rating } from '../components/UI';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/products/${id}`)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, qty);
    navigate('/cart');
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/products/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(review),
      });
      setReviewMsg('Review submitted!');
      const updated = await apiFetch(`/products/${id}`);
      setProduct(updated);
    } catch (err) {
      setReviewMsg(err.message);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Message variant="error">{error}</Message>;
  if (!product) return null;

  return (
    <div className="page container product-page">
      <div className="product-detail">
        <img src={product.image} alt={product.name} className="product-detail-image" />
        <div className="product-detail-info">
          <span className="product-category">{product.category}</span>
          <h1>{product.name}</h1>
          <Rating value={product.rating} text={`${product.numReviews} reviews`} />
          <p className="product-detail-price">{formatPrice(product.price)}</p>
          <p className="product-detail-desc">{product.description}</p>
          <p className="stock-status">
            Status: {product.countInStock > 0 ? `In Stock (${product.countInStock})` : 'Out of Stock'}
          </p>

          {product.countInStock > 0 && (
            <div className="add-to-cart-row">
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input">
                {[...Array(Math.min(product.countInStock, 10)).keys()].map((x) => (
                  <option key={x + 1} value={x + 1}>
                    {x + 1}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={handleAddToCart}>
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="reviews-section">
        <h2>Reviews</h2>
        {product.reviews.length === 0 && <p>No reviews yet.</p>}
        {product.reviews.map((r) => (
          <div key={r._id} className="review-card">
            <strong>{r.name}</strong>
            <Rating value={r.rating} />
            <p>{r.comment}</p>
            <small>{new Date(r.createdAt).toLocaleDateString()}</small>
          </div>
        ))}

        {user && (
          <form onSubmit={submitReview} className="review-form">
            <h3>Write a Review</h3>
            {reviewMsg && <Message variant={reviewMsg.includes('submitted') ? 'success' : 'error'}>{reviewMsg}</Message>}
            <label>
              Rating
              <select
                value={review.rating}
                onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
                className="input"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} - {n === 5 ? 'Excellent' : n === 1 ? 'Poor' : 'Good'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea
                required
                rows={4}
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                className="input"
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Submit Review
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
