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
          <span className="logo-icon">🛍</span>
          MERN Shop
        </Link>

        <nav className="nav">
          <Link to="/">Shop</Link>
          {user ? (
            <>
              <Link to="/orders">My Orders</Link>
              {user.isAdmin && <Link to="/admin">Admin</Link>}
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Sign In</Link>
          )}
          <Link to="/cart" className="cart-link">
            Cart
            {itemsCount > 0 && <span className="cart-badge">{itemsCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
