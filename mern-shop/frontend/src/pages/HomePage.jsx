import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import ProductCard from '../components/ProductCard';
import Loader, { Message } from '../components/UI';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/products/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (keyword) params.set('keyword', keyword);
        if (category) params.set('category', category);
        const query = params.toString() ? `?${params}` : '';
        const data = await apiFetch(`/products${query}`);
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [keyword, category]);

  return (
    <div className="page">
      <section className="hero">
        <div className="container">
          <h1>Discover quality products</h1>
          <p>Shop electronics, fashion, sports gear and more — delivered to your door.</p>
        </div>
      </section>

      <section className="container shop-section">
        <div className="filters">
          <input
            type="search"
            placeholder="Search products..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input search-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input select-input"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="error">{error}</Message>
        ) : products.length === 0 ? (
          <Message>No products found.</Message>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
