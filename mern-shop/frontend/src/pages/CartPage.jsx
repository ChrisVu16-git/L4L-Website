import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/api';
import { Message } from '../components/UI';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQty, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const shipping = subtotal > 100 ? 0 : subtotal > 0 ? 10 : 0;
  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = subtotal + shipping + tax;

  const checkoutHandler = () => {
    if (!user) {
      navigate('/login?redirect=shipping');
    } else {
      navigate('/shipping');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="page container cart-page">
        <h1>Shopping Cart</h1>
        <Message>Your cart is empty.</Message>
        <Link to="/" className="btn btn-primary">
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="page container cart-page">
      <h1>Shopping Cart</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={item._id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="cart-item-info">
                <Link to={`/product/${item._id}`}>{item.name}</Link>
                <p>{formatPrice(item.price)}</p>
              </div>
              <select
                value={item.qty}
                onChange={(e) => updateQty(item._id, Number(e.target.value))}
                className="input input-sm"
              >
                {[...Array(Math.min(item.countInStock, 10)).keys()].map((x) => (
                  <option key={x + 1} value={x + 1}>
                    {x + 1}
                  </option>
                ))}
              </select>
              <span className="cart-item-total">{formatPrice(item.price * item.qty)}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeFromCart(item._id)}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary card">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Tax (10%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={checkoutHandler}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
