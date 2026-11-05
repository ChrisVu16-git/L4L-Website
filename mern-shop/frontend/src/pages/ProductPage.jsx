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
      setReviewMsg("Đã gửi đánh giá thành công!");
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
          <Rating value={product.rating} text={`${product.numReviews} đánh giá`} />
          <p className="product-detail-price">{formatPrice(product.price)}</p>
          <p className="product-detail-desc">{product.description}</p>
          <p className="stock-status">
            Tình trạng: {product.countInStock > 0 ? `Còn ${product.countInStock} sản phẩm` : "Hết hàng"}
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
                Thêm vào giỏ hàng
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="reviews-section">
        <h2>Đánh giá của khách hàng</h2>
        {product.reviews.length === 0 && <p>Sản phẩm chưa có đánh giá.</p>}
        {product.reviews.map((r) => (
          <div key={r._id} className="review-card">
            <strong>{r.name}</strong>
            <Rating value={r.rating} />
            <p>{r.comment}</p>
            <small>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</small>
          </div>
        ))}

        {user && (
          <form onSubmit={submitReview} className="review-form">
            <h3>Chia sẻ đánh giá của bạn</h3>
            {reviewMsg && <Message variant={reviewMsg.includes('thành công') ? 'success' : 'error'}>{reviewMsg}</Message>}
            <label>
              Đánh giá
              <select
                value={review.rating}
                onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
                className="input"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} - {n === 5 ? "Rất tốt" : n === 1 ? "Chưa hài lòng" : "Tốt"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nhận xét
              <textarea
                required
                rows={4}
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                className="input"
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Gửi đánh giá
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
