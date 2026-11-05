import { guestTokenFor, saveGuestAccess } from '../utils/guestOrders';
import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { statusLabels, orderStatus } from '../utils/commerce-rules';
import { apiFetch, formatPrice } from '../utils/api';
import Loader, { Message } from '../components/UI';
export default function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [order,setOrder] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [accessVersion,setAccessVersion] = useState(0), [lookupCode,setLookupCode] = useState(''), [errorCode,setErrorCode] = useState('');
  const [paying,setPaying] = useState(false), [paymentError,setPaymentError] = useState('');
  const returned = params.get('payment') === 'pending', failed = params.get('payment') === 'failed';
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(''); setErrorCode('');
      try {
        let data = await apiFetch(`/orders/${id}`);
        if (returned && !data.isPaid) for (let i=0;i<5;i++) {
          await new Promise(resolve => setTimeout(resolve,2000));
          if (cancelled) return;
          data = await apiFetch(`/orders/${id}`); if (data.isPaid) break;
        }
        if (!cancelled) setOrder(data);
      } catch (err) { if (!cancelled) { setError(err.message); setErrorCode(err.code || ''); } }
      finally { if (!cancelled) setLoading(false); }
    };
    load(); return () => { cancelled = true; };
  }, [id,returned,accessVersion]);
  const pay = async () => {
    setPaying(true); setPaymentError('');
    try {
      const checkout = await apiFetch(`/orders/${id}/checkout`, { method:'POST' });
      window.location.assign(checkout.url);
    }
    catch (err) { setPaymentError(err.message); } finally { setPaying(false); }
  };
  if (loading) return <Loader />;
  if (error) return <div className="page container auth-page"><div className="card auth-card"><Message variant="error">{error}</Message>
    {errorCode === 'ORDER_ACCESS_REQUIRED' && <form onSubmit={event => { event.preventDefault(); try { saveGuestAccess(id,lookupCode.trim());setAccessVersion(value=>value+1); } catch(err){setError(err.message);} }}>
      <label>Mã tra cứu đơn khách<input className="input" type="password" required maxLength={64} value={lookupCode} onChange={event=>setLookupCode(event.target.value)} autoComplete="off" /></label>
      <button className="btn btn-primary">Xem đơn hàng</button>
    </form>}<p><Link to="/login">Đăng nhập</Link> nếu đây là đơn hàng của tài khoản.</p>
  </div></div>;
  if (!order) return null;
  const status = orderStatus(order), shipping = order.shippingAddress;
  const steps = ['placed','processing','shipping','delivered'];
  return <div className="page container order-page">
    <h1>Đơn hàng #{order._id.slice(-8).toUpperCase()}</h1>
    {order.isGuest && <div className="card"><p>Đơn hàng khách vãng lai — không cần tài khoản.</p>
      {guestTokenFor(id) && <details><summary>Lưu mã tra cứu đơn hàng</summary><p>Giữ đường dẫn trang này và mã dưới đây để xem đơn ở thiết bị khác. Không chia sẻ mã công khai.</p><input className="input" aria-label="Mã tra cứu bí mật" readOnly value={guestTokenFor(id)} onFocus={event=>event.currentTarget.select()} /></details>}
    </div>}
    <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>
    {status !== 'cancelled' && <ol className="order-timeline" aria-label="Tiến trình đơn hàng">{steps.map((step,index) => <li key={step} className={index <= steps.indexOf(status) ? 'active' : ''} aria-current={step === status ? 'step' : undefined}>{index+1}. {statusLabels[step]}</li>)}</ol>}
    {returned && order.isPaid && <Message variant="success">Thanh toán thành công. Cảm ơn bạn đã đặt hàng!</Message>}
    {returned && !order.isPaid && <Message>Đang chờ xác nhận thanh toán. Bạn vui lòng tải lại trang sau ít phút.</Message>}
    {failed && <Message variant="error">Thanh toán chưa thành công hoặc đã bị hủy. Bạn có thể thử lại.</Message>}
    <div className="order-grid">
      <div className="card"><h2>Thông tin nhận hàng</h2><p><strong>{shipping.recipientName || order.user?.name || 'Chưa cập nhật'}</strong></p>
        <p>{shipping.phone || 'Chưa cập nhật số điện thoại'}</p><p>{[shipping.address,shipping.ward,shipping.city,shipping.postalCode,shipping.country].filter(Boolean).join(', ')}</p>
        {order.trackingNumber && <p>Mã vận đơn: <strong>{order.trackingNumber}</strong></p>}
        {order.deliveredAt && <p>Ngày giao: {new Date(order.deliveredAt).toLocaleDateString('vi-VN')}</p>}
      </div>
      <div className="card"><h2>Thanh toán</h2><p>{order.isPaid ? 'Đã thanh toán' : 'VNPay thử nghiệm — không dùng thẻ thật'}</p>
        {!order.isPaid && status !== 'cancelled' && <><p>Số tiền thanh toán: <strong>{formatPrice(order.totalPrice)}</strong></p>{paymentError && <Message variant="error">{paymentError}</Message>}
          <button className="btn btn-primary" disabled={paying} onClick={pay}>{paying ? 'Đang chuẩn bị…' : 'Thanh toán qua VNPay thử nghiệm'}</button></>}
        {order.isPaid && <Message variant="success">Thanh toán ngày {new Date(order.paidAt).toLocaleDateString('vi-VN')}</Message>}
      </div>
      <div className="card order-items-card"><h2>Sản phẩm đã đặt</h2>{order.orderItems.map(item => <div className="order-item" key={item.product}><img src={item.image} alt={item.name} /><div><Link to={`/product/${item.product}`}>{item.name}</Link><p>{item.qty} × {formatPrice(item.price)} = {formatPrice(item.qty*item.price)}</p></div></div>)}</div>
      <div className="card cart-summary"><h2>Chi tiết thanh toán</h2>{[['Tiền sản phẩm',order.itemsPrice],['Phí giao hàng',order.shippingPrice],['Thuế (10%)',order.taxPrice],['Tổng thanh toán',order.totalPrice]].map(([label,value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{formatPrice(value)}</strong></div>)}</div>
    </div>
  </div>;
}
