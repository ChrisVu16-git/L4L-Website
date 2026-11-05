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
      <section className="hero figure-hero">
        <div className="container figure-hero-inner">
          <div>
            <p className="eyebrow">L4LStore / The collector’s corner</p>
            <h1>Small figures.<br />Big personalities.</h1>
            <p>Find the next centrepiece for your shelf. Explore figures, collectibles, and characters worth making room for.</p>
            <a className="btn btn-primary" href="#collection">Explore the collection ↗</a>
          </div>
          <div className="collector-display" aria-label="Figure collection display">
            <span className="display-label">YOUR NEXT SHELF FAVOURITE</span>
            {products[0]?.image ? <img src={products[0].image} alt={products[0].name} /> : <span className="display-monogram" aria-hidden="true">L4L</span>}
            <span className="display-caption">A little character goes a long way.</span>
          </div>
        </div>
      </section>

      <section className="container shop-section" id="collection" aria-labelledby="collection-title">
        <div className="collection-heading">
          <div><p className="eyebrow">Find your favourites</p><h2 id="collection-title">The collection</h2></div>
          <span>Figures & collectibles</span>
        </div>
        <div className="filters">
          <input
            type="search"
            aria-label="Search figures"
            placeholder="Search characters, figures, and more..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input search-input"
          />
          <select
            aria-label="Filter by category"
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
