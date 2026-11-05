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

  return data;
}

export const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND', maximumFractionDigits: 0,
  }).format(price);
