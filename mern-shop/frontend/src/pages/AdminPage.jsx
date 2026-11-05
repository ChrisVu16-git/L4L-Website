import AdminOrders from '../components/AdminOrders';
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
      setError(err.message || "Không tải được dữ liệu quản trị.");
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
      imageKey: '',
      imagePublicId: '',
      price: 0,
      currency: 'VND',
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
      setUploadError("Vui lòng chọn ảnh JPG, PNG, WebP hoặc AVIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Vui lòng chọn ảnh không quá 5 MB.");
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
       // 1. Ask backend for a temporary upload URL.
      const { uploadUrl , imageUrl , key } = await apiFetch(
        '/uploads/image/presign',
        {
          method : 'POST',
          body : JSON.stringify({
            contentType : file.type,
          }),
        }
      );

       // 2. Upload the image directly to R2.
       const uploadResponse = await fetch(uploadUrl, {
          method : 'PUT',
          headers : {
            'Content-Type' : file.type,
          },
          body : file,
         });

        if (!uploadResponse.ok) {
          throw new Error("Không thể tải ảnh lên. Vui lòng thử lại.");
        }

        // 3. Save the image information in the product form.
        setEditing((current) =>
          current
            ? {
                ...current,
                image: imageUrl,
                imageKey: key,
                imagePublicId: '',

              }
            : current 
        );
    } catch (err) {
      setUploadError(err.message || "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  }
  //     const formData = new FormData();
  //     formData.append('image', file);

  //     const result = await apiFetch('/uploads/image', {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     if (!result.imageUrl || !result.publicId) {
  //       throw new Error('Upload succeeded, but the image URL or public ID was missing.');
  //     }
  //     setEditing((current) =>
  //       current ? {
  //         ...current,
  //         image: result.imageUrl,
  //         imagePublicId: result.publicId } :
  //       current
  //     );
  //   } catch (err) {
  //     setUploadError(err.message || 'Image upload failed.');
  //   } finally {
  //     setUploading(false);
  //    }
  //  };

  const saveProduct = async (event) => {
    event.preventDefault();

    if (uploading) {
      alert("Vui lòng chờ tải ảnh xong.");
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
      alert(err.message || "Không thể lưu sản phẩm.");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Bạn muốn xóa sản phẩm này?")) return;

    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      alert(err.message || "Không thể xóa sản phẩm. Vui lòng thử lại.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page container admin-page">
      <h1>Trang quản trị</h1>

      {error && <Message variant="error">{error}</Message>}

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'products' ? 'tab active' : 'tab'}
          onClick={() => setTab('products')}
        >
          Sản phẩm
        </button>

        <button
          type="button"
          className={tab === 'orders' ? 'tab active' : 'tab'}
          onClick={() => setTab('orders')}
        >
          Đơn hàng
        </button>
      </div>

      {tab === 'products' && (
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={createProduct}
          >
            + Thêm sản phẩm
          </button>

          {editing && (
            <form onSubmit={saveProduct} className="card admin-edit-form">
              <h2>{editing._id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>

              {['name', 'description', 'category'].map((field) => (
                <label key={field}>
                  {{ name: 'Tên sản phẩm', description: 'Mô tả', category: 'Danh mục' }[field]}
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
                Ảnh sản phẩm
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
                {uploading ? "Đang tải ảnh…" : "Tải ảnh lên"}
              </button>

              {uploadError && (
                <p role="alert" className="error">
                  {uploadError}
                </p>
              )}

              {editing.image && (
                <div className="image-preview">
                  <p>Ảnh xem trước</p>
                  <img
                    src={editing.image}
                    alt={editing.name || "Ảnh sản phẩm"}
                    style={{
                      display: 'block',
                      width: '180px',
                      maxHeight: '180px',
                      objectFit: 'contain',
                      marginBottom: '12px',
                    }}
                  />

                  <label>
                    Đường dẫn ảnh
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
                Giá (VND)
                <input
                  type="number"
                  min="0"
                  step="1"
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
                Số lượng tồn
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
                  {editing._id ? "Lưu thay đổi" : "Thêm sản phẩm"}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditing(null);
                    setUploadError('');
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Hình ảnh</th>
                  <th>Giá (VND)</th>
                  <th>Danh mục</th>
                  <th>Số lượng tồn</th>
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
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteProduct(product._id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && <AdminOrders orders={orders} onSaved={loadData} />}
    </div>
  );
}
