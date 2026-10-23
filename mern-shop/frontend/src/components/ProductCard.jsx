import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/api';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product._id}`} className="product-card">
      <div className="product-image-wrap">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.countInStock === 0 && <span className="badge badge-sold">Sold Out</span>}
      </div>
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>
        <div className="product-meta">
          <span className="product-price">{formatPrice(product.price)}</span>
          {product.rating > 0 && (
            <span className="product-rating">★ {product.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
