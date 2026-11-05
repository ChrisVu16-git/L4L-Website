import { toVnd } from './commerce-rules';
import { userMessage } from './messages';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch(endpoint, options = {}) {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : null;

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Only set JSON content type for normal JSON requests.
  // FormData must let the browser set its own multipart boundary.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method || 'GET').toUpperCase();
  const changesCommerce = ['POST','PUT','PATCH'].includes(method) && (/^\/orders(?:\/|$)/.test(endpoint) || (/^\/products(?:\/[^/]+)?$/.test(endpoint)));
  if (changesCommerce) {
    headers['X-L4L-Client-Currency'] = 'VND';
    let ready;
    try { ready = await fetch(`${API_URL}/health`, { cache: 'no-store' }); }
    catch { throw new Error('Chưa thể kết nối đến cửa hàng. Bạn vui lòng thử lại.'); }
    if (!ready.ok || ready.headers.get('X-L4L-Currency') !== 'VND') throw new Error('Cửa hàng đang cập nhật bảng giá VND. Bạn vui lòng chờ ít phút rồi tải lại trang.');
  }
  let res;
  try { res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  }); } catch { throw new Error('Không thể kết nối đến cửa hàng. Bạn vui lòng kiểm tra mạng và thử lại.'); }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(userMessage(data.message, res.status));
    error.code = data.code;
    error.verificationPending = data.verificationPending === true;
    throw error;
  }

  // Rolling deployments may briefly serve legacy USD responses. Normalize reads
  // while writes wait for a backend that explicitly advertises VND support.
  const normalize = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    if (endpoint.startsWith('/products') && typeof value.price === 'number') return { ...value, price: toVnd(value.price, value.currency), currency: 'VND' };
    if (endpoint.startsWith('/orders') && typeof value.totalPrice === 'number') {
      const result = { ...value, currency: 'VND' };
      for (const key of ['itemsPrice','shippingPrice','taxPrice','totalPrice']) result[key] = toVnd(value[key] || 0, value.currency);
      result.orderItems = (value.orderItems || []).map(item => ({ ...item, price: toVnd(item.price, value.currency) }));
      return result;
    }
    return value;
  };
  return Array.isArray(data) ? data.map(normalize) : normalize(data);
}

export const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND', maximumFractionDigits: 0,
  }).format(price);
