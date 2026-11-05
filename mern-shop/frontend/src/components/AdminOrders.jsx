import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderStatus, statusLabels, validateShipping } from '../utils/commerce-rules';
import { apiFetch, formatPrice } from '../utils/api';
import ShippingFields from './ShippingFields';
import { Message } from './UI';
const nextStates = { placed: ['processing','cancelled'], processing: ['shipping','cancelled'], shipping: ['delivered'], delivered: [], cancelled: [] };
export default function AdminOrders({ orders, onSaved }) {
  const [filter,setFilter] = useState(''), [editing,setEditing] = useState(null), [error,setError] = useState(''), [errors,setErrors] = useState({}), [saving,setSaving] = useState(false);
  const visible = orders.filter(order => !filter || orderStatus(order) === filter);
  const edit = order => { setEditing({ ...order, originalStatus: orderStatus(order), status: orderStatus(order), shippingAddress: { country: 'Việt Nam', ...order.shippingAddress } }); setError(''); setErrors({}); };
  const save = async event => {
    event.preventDefault(); setError('');
    const editableAddress = ['placed','processing'].includes(editing.originalStatus);
    const checked = validateShipping(editing.shippingAddress);
    setErrors(editableAddress ? checked.errors : {});
    if (editableAddress && Object.keys(checked.errors).length) return;
    setSaving(true);
    try {
      await apiFetch(`/orders/${editing._id}`, { method: 'PUT', body: JSON.stringify({ version: editing.version, status: editing.status,
        ...(editableAddress ? { shippingAddress: checked.value } : {}), trackingNumber: editing.trackingNumber || '', adminNote: editing.adminNote || '' }) });
      setEditing(null); await onSaved();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  return <section aria-label="Quản lý đơn hàng">
    <div className="order-summary-counts">{Object.entries(statusLabels).map(([key,label]) => <button type="button" className={`btn ${filter === key ? 'btn-primary' : 'btn-ghost'}`} key={key} onClick={() => setFilter(filter === key ? '' : key)}>{label}: {orders.filter(o => orderStatus(o) === key).length}</button>)}</div>
    <label>Lọc đơn hàng<select className="input" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
    {error && <Message variant="error">{error}</Message>}
    {editing && <form className="card admin-edit-form" onSubmit={save} noValidate>
      <h2>Sửa đơn #{editing._id.slice(-8).toUpperCase()}</h2>
      <label>Trạng thái<select className="input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
        {[editing.originalStatus,...nextStates[editing.originalStatus]].map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
      </select></label>
      <ShippingFields value={editing.shippingAddress} onChange={shippingAddress => setEditing({ ...editing, shippingAddress })} errors={errors} disabled={!['placed','processing'].includes(editing.originalStatus)} />
      <label>Mã vận đơn<input className="input" maxLength={100} value={editing.trackingNumber || ''} onChange={e => setEditing({ ...editing, trackingNumber: e.target.value })} /></label>
      <label>Ghi chú nội bộ<textarea className="input" maxLength={1000} value={editing.adminNote || ''} onChange={e => setEditing({ ...editing, adminNote: e.target.value })} /></label>
      <div className="btn-row"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button><button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(null)}>Đóng</button></div>
    </form>}
    <div className="table-wrap"><table className="table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {visible.map(order => <tr key={order._id}><td>{order._id.slice(-8).toUpperCase()}</td><td>{order.user?.name || 'Tài khoản đã xóa'}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td>{formatPrice(order.totalPrice)}</td><td>{order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td><td><span className={`status-badge status-${orderStatus(order)}`}>{statusLabels[orderStatus(order)]}</span></td><td><Link className="btn btn-ghost btn-sm" to={`/order/${order._id}`}>Chi tiết</Link><button type="button" className="btn btn-primary btn-sm" onClick={() => edit(order)}>Sửa đơn</button></td></tr>)}
      {!visible.length && <tr><td colSpan={7}>Không có đơn hàng phù hợp.</td></tr>}
    </tbody></table></div>
  </section>;
}
