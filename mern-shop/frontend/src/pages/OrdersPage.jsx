import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statusLabels, orderStatus } from '../utils/commerce-rules';
import { apiFetch, formatPrice } from '../utils/api';
import Loader, { Message } from '../components/UI';
export default function OrdersPage() {
  const [orders,setOrders] = useState([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [filter,setFilter] = useState('');
  useEffect(() => { apiFetch('/orders/myorders').then(setOrders).catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader />;
  const visible = orders.filter(order => !filter || orderStatus(order) === filter);
  return <div className="page container"><h1>Đơn hàng của tôi</h1>
    {error && <Message variant="error">{error}</Message>}
    <label>Lọc theo trạng thái<select className="input" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tất cả đơn hàng</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {!visible.length ? <Message>Chưa có đơn hàng phù hợp. <Link to="/">Khám phá sản phẩm</Link></Message> : <div className="table-wrap"><table className="table">
      <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>{visible.map(order => <tr key={order._id}><td>{order._id.slice(-8).toUpperCase()}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td>{formatPrice(order.totalPrice)}</td><td>{order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td><td><span className={`status-badge status-${orderStatus(order)}`}>{statusLabels[orderStatus(order)]}</span></td><td><Link to={`/order/${order._id}`} className="btn btn-ghost btn-sm">Xem chi tiết</Link></td></tr>)}</tbody>
    </table></div>}
  </div>;
}
