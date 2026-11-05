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
            <p className="eyebrow">L4LStore / Góc của người sưu tầm</p>
            <h1>Mô hình nhỏ.<br />Đam mê lớn.</h1>
            <p>Tìm nhân vật yêu thích cho góc trưng bày của bạn. Khám phá các mẫu mô hình và món đồ sưu tầm đầy cá tính.</p>
            <a className="btn btn-primary" href="#collection">Khám phá bộ sưu tập ↗</a>
          </div>
          <div className="collector-display" aria-label="Góc trưng bày mô hình">
            <span className="display-label">NHÂN VẬT TIẾP THEO TRONG BỘ SƯU TẬP</span>
            {products[0]?.image ? <img src={products[0].image} alt={products[0].name} /> : <span className="display-monogram" aria-hidden="true">L4L</span>}
            <span className="display-caption">Thêm cá tính cho góc trưng bày của bạn.</span>
          </div>
        </div>
      </section>

      <section className="container shop-section" id="collection" aria-labelledby="collection-title">
        <div className="collection-heading">
          <div><p className="eyebrow">Tìm mẫu mô hình bạn yêu thích</p><h2 id="collection-title">Bộ sưu tập</h2></div>
          <span>Mô hình và đồ sưu tầm</span>
        </div>
        <div className="filters">
          <input
            type="search"
            aria-label="Tìm kiếm mô hình"
            placeholder="Tìm theo tên mô hình hoặc nhân vật…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input search-input"
          />
          <select
            aria-label="Lọc theo danh mục"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input select-input"
          >
            <option value="">Tất cả danh mục</option>
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
          <Message>Chưa tìm thấy sản phẩm phù hợp.</Message>
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
