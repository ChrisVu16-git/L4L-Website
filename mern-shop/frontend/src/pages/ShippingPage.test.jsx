import { afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ShippingPage from './ShippingPage';
vi.mock('../context/AuthContext', () => ({useAuth:()=>({user:null})}));
afterEach(() => { cleanup(); localStorage.clear(); });
const show = () => render(<MemoryRouter initialEntries={['/shipping']}><Routes><Route path="/shipping" element={<ShippingPage />} /><Route path="/payment" element={<p>Trang thanh toán</p>} /></Routes></MemoryRouter>);
test('invalid shipping stays on the form and does not save an address', () => {
  show(); fireEvent.click(screen.getByRole('button',{name:'Tiếp tục thanh toán'}));
  expect(screen.getByText(/Vui lòng nhập số điện thoại/)).toBeTruthy();
  expect(localStorage.getItem('shippingAddress')).toBeNull();
});
test('valid shipping normalizes phone and continues to payment', async () => {
  show();
  for (const [label,value] of [['Họ tên người nhận','Nguyễn Văn An'],['Số điện thoại','+84 912 345 678'],['Số nhà, tên đường','12 Nguyễn Huệ'],['Phường/Xã','Phường Sài Gòn'],['Tỉnh/Thành phố','TP. Hồ Chí Minh']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
  fireEvent.click(screen.getByRole('button',{name:'Tiếp tục thanh toán'}));
  expect(await screen.findByText('Trang thanh toán')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('shippingAddress')).phone).toBe('0912345678');
});
