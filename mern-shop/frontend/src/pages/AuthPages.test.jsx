import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';

const { register, login } = vi.hoisted(() => ({ register: vi.fn(), login: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ register, login }) }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
const show = (Page, path = '/register') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={<Page />} /><Route path="/" element={<p>Shop home</p>} /></Routes></MemoryRouter>);
function fillSignup() {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Collector' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'collector@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'TestPassword123!' } });
  fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'TestPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
}
test('signup has no email confirmation controls or confirmation copy', () => {
  show(RegisterPage);
  expect(screen.queryByRole('button', { name: /resend|confirm email/i })).toBeNull();
  expect(screen.getByLabelText('Email')).toBeTruthy();
  expect(screen.queryByText(/Gmail welcome|Other email providers are welcome|Confirm your email/)).toBeNull();
});
test('signup continues directly to the shop', async () => {
  register.mockResolvedValue({ token: 'test-token', emailVerified: false });
  show(RegisterPage); fillSignup();
  expect(await screen.findByText('Shop home')).toBeTruthy();
  expect(register).toHaveBeenCalledWith('Collector', 'collector@gmail.com', 'TestPassword123!', '0912345678');
});
test('duplicate signup shows the sign-in error without a resend button', async () => {
  register.mockRejectedValue(new Error('Account already exists. Please sign in.'));
  show(RegisterPage); fillSignup();
  await screen.findByText('Account already exists. Please sign in.');
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
});
test('existing unverified users can sign in without confirmation UI', async () => {
  login.mockResolvedValue({ token: 'test-token', emailVerified: false });
  show(LoginPage, '/login');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'collector@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'TestPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Shop home')).toBeTruthy();
});
