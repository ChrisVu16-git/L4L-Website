import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { itemsCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">✦</span>
          L4LStore
        </Link>

        <nav className="nav" aria-label="Điều hướng chính">
          <Link to="/">Cửa hàng</Link>
          {user ? (
            <>
              <Link to="/orders">Đơn hàng của tôi</Link>
              {user.isAdmin && <Link to="/admin">Quản trị</Link>}
              <span className="nav-user">Chào, {user.name.split(' ')[0]}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login">Đăng nhập</Link>
          )}
          <Link to="/cart" className="cart-link">
            Giỏ hàng
            {itemsCount > 0 && <span className="cart-badge">{itemsCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
