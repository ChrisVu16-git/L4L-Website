import { afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminOrders from './AdminOrders';
import { apiFetch } from '../utils/api';
vi.mock('../utils/api', () => ({apiFetch:vi.fn(),formatPrice:value=>`${value} ₫`}));
afterEach(() => {cleanup();vi.resetAllMocks();});
const address={recipientName:'Nguyễn Văn An',phone:'0912345678',address:'12 Nguyễn Huệ',ward:'Phường Sài Gòn',city:'TP. Hồ Chí Minh',country:'Việt Nam'};
const order={_id:'111111111111111111111111',user:{name:'Nguyễn Văn An'},createdAt:'2026-11-05',totalPrice:937500,isPaid:false,status:'placed',version:0,shippingAddress:address};
test('admin can submit contact/status edits with the current version',async()=>{
  const onSaved=vi.fn();apiFetch.mockResolvedValue({});
  render(<MemoryRouter><AdminOrders orders={[order]} onSaved={onSaved}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Sửa đơn'}));
  fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'processing'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}));
  await waitFor(()=>expect(onSaved).toHaveBeenCalled());
  const [url,options]=apiFetch.mock.calls[0];const body=JSON.parse(options.body);
  expect(url).toBe(`/orders/${order._id}`);expect(body.version).toBe(0);expect(body.status).toBe('processing');expect(body.isPaid).toBeUndefined();
});
test('admin form blocks an invalid address before calling the API',()=>{
  render(<MemoryRouter><AdminOrders orders={[order]} onSaved={vi.fn()}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Sửa đơn'}));
  fireEvent.change(screen.getByLabelText('Số điện thoại'),{target:{value:'123'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}));
  expect(screen.getByText(/Vui lòng nhập số điện thoại/)).toBeTruthy();expect(apiFetch).not.toHaveBeenCalled();
});
