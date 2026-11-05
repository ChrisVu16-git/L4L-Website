const messages = {
  'Invalid email or password': 'Email hoặc mật khẩu chưa đúng.',
  'Account already exists. Please sign in.': 'Email này đã có tài khoản. Bạn vui lòng đăng nhập.',
  'Enter a name, valid email, and password of 8–72 bytes.': 'Vui lòng nhập họ tên, email hợp lệ và mật khẩu từ 8 ký tự (tối đa 72 byte).',
  'Admin access required': 'Bạn cần quyền quản trị để thực hiện thao tác này.',
  'Not authorized': 'Bạn không có quyền truy cập nội dung này.',
  'Not authorized, no token': 'Bạn vui lòng đăng nhập để tiếp tục.',
  'Not authorized, token failed': 'Phiên đăng nhập đã hết hạn. Bạn vui lòng đăng nhập lại.',
  'User not found': 'Không tìm thấy tài khoản.',
  'Product not found': 'Sản phẩm không còn tồn tại.',
  'Order not found': 'Không tìm thấy đơn hàng.',
  'Invalid order ID': 'Mã đơn hàng không hợp lệ.',
  'Invalid product ID': 'Mã sản phẩm không hợp lệ.',
  'Order already paid': 'Đơn hàng đã được thanh toán.',
  'Invalid order items or quantities.': 'Sản phẩm hoặc số lượng đặt hàng không hợp lệ.',
  'No order items': 'Bạn chưa chọn sản phẩm nào.',
  'An item is no longer in stock.': 'Một sản phẩm trong đơn đã hết hàng.',
  'Order payment status changed. Refresh the order.': 'Đơn hàng vừa được cập nhật. Bạn vui lòng tải lại trang.',
  'Could not prepare checkout. Try again.': 'Chưa thể tạo thanh toán. Bạn vui lòng thử lại.',
  'Please provide all required product fields': 'Vui lòng điền đầy đủ thông tin sản phẩm.',
  'Price must be non-negative and stock must be a non-negative integer': 'Giá VND và số lượng tồn phải là số nguyên không âm.',
  'Invalid product fields': 'Thông tin sản phẩm không hợp lệ. Kiểm tra lại giá, tồn kho và hình ảnh.',
  'Price and stock cannot be empty': 'Vui lòng nhập giá và số lượng tồn.',
  'Invalid R2 image key': 'Thông tin ảnh không hợp lệ. Vui lòng tải lại ảnh.',
  'Product already reviewed': 'Bạn đã đánh giá sản phẩm này rồi.',
  'Rating must be an integer from 1 to 5, and comment is required': 'Vui lòng chọn từ 1 đến 5 sao và nhập nhận xét.',
};
export function userMessage(message, status) {
  if (messages[message]) return messages[message];
  if (message?.startsWith('VNPay sandbox is not configured')) return 'Chưa cấu hình thanh toán VNPay thử nghiệm. Bạn vui lòng thử lại sau.';
  if (message?.startsWith('Insufficient stock')) return 'Số lượng sản phẩm còn lại không đủ. Bạn vui lòng kiểm tra giỏ hàng.';
  if (message?.startsWith('Product not found:')) return 'Một sản phẩm trong đơn không còn tồn tại.';
  if (/[À-ỹĐđ]/u.test(message || '')) return message;
  if (status === 429) return 'Bạn thao tác hơi nhanh. Vui lòng chờ ít phút rồi thử lại.';
  if (status === 401) return 'Bạn vui lòng đăng nhập lại để tiếp tục.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  return 'Chưa thể thực hiện yêu cầu. Bạn vui lòng thử lại sau.';
}
