import { test, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductPage from './ProductPage';
vi.mock('../utils/api',()=>({apiFetch:vi.fn(async()=>({_id:'abc',name:'Figure demo',price:100000,reviews:[],countInStock:1})),formatPrice:value=>String(value)}));
vi.mock('../context/CartContext',()=>({useCart:()=>({addToCart:vi.fn()})}));
vi.mock('../context/AuthContext',()=>({useAuth:()=>({user:null})}));
test('cancel return shows a notice on the usable product page',async()=>{
  render(<MemoryRouter initialEntries={['/product/abc?payment=cancelled']}><Routes><Route path="/product/:id" element={<ProductPage/>}/></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Figure demo'})).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Bạn đã hủy thanh toán');
  expect(screen.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeTruthy();
  cleanup();
});
