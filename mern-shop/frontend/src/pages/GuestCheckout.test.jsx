import { afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import CartPage from './CartPage';
import PlaceOrderPage from './PlaceOrderPage';
import { guestTokenFor } from '../utils/guestOrders';
const {apiFetch,clearCart}=vi.hoisted(()=>({apiFetch:vi.fn(),clearCart:vi.fn()}));
vi.mock('../utils/api',()=>({apiFetch,formatPrice:value=>`${value} ₫`}));
vi.mock('../context/CartContext',()=>({useCart:()=>({cartItems:[{_id:'111111111111111111111111',name:'Figure',image:'https://example.test/a.jpg',price:625000,qty:1,countInStock:5}],subtotal:625000,clearCart,removeFromCart:vi.fn(),updateQty:vi.fn()})}));
afterEach(()=>{cleanup();localStorage.clear();vi.resetAllMocks();});
test('cart proceeds to shipping without a login redirect',async()=>{
  render(<MemoryRouter initialEntries={['/cart']}><Routes><Route path="/cart" element={<CartPage/>}/><Route path="/shipping" element={<p>Thông tin khách</p>}/></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Tiến hành đặt hàng'}));
  expect(await screen.findByText('Thông tin khách')).toBeTruthy();
});
function Receipt(){const{id}=useParams();return <p>{guestTokenFor(id) ? 'Đã lưu mã tra cứu khách' : 'Chưa có mã'}</p>;}
test('guest order stores private access before clearing the cart and opening its receipt',async()=>{
  localStorage.setItem('shippingAddress',JSON.stringify({recipientName:'Nguyễn Văn An',phone:'0912345678',address:'12 Nguyễn Huệ',ward:'Phường Sài Gòn',city:'TP. Hồ Chí Minh',country:'Việt Nam'}));
  apiFetch.mockResolvedValue({_id:'aaaaaaaaaaaaaaaaaaaaaaaa',guestAccessToken:'b'.repeat(64)});
  render(<MemoryRouter initialEntries={['/placeorder']}><Routes><Route path="/placeorder" element={<PlaceOrderPage/>}/><Route path="/order/:id" element={<Receipt/>}/></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Đặt hàng thử nghiệm'}));
  expect(await screen.findByText('Đã lưu mã tra cứu khách')).toBeTruthy();
  expect(clearCart).toHaveBeenCalled();expect(localStorage.getItem('shippingAddress')).toBeNull();
});
