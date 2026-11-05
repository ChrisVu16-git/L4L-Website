import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';

const { register, login, apiFetch } = vi.hoisted(() => ({ register: vi.fn(), login: vi.fn(), apiFetch: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ register, login }) }));
vi.mock('../utils/api', () => ({ apiFetch }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
const show = Page => render(<MemoryRouter><Page /></MemoryRouter>);
function fillSignup() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Collector' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'collector@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'TestPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
}
test('signup starts without resend and without removed Gmail/helper copy', () => {
  show(RegisterPage);
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
  expect(screen.getByLabelText('Email')).toBeTruthy();
  expect(screen.queryByText(/Gmail welcome|Other email providers are welcome|Use an email you can access/)).toBeNull();
});
test('resend appears only after pending signup and uses the submitted address', async () => {
  register.mockResolvedValue({ verificationPending: true, message: 'Check your inbox' });
  apiFetch.mockResolvedValue({ message: 'Confirmation requested' });
  show(RegisterPage); fillSignup();
  const resend = await screen.findByRole('button', { name: 'Resend confirmation' });
  expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  fireEvent.click(resend);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/resend-verification', { method: 'POST', body: JSON.stringify({ email: 'collector@gmail.com' }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Use a different email' }));
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
});
test('missing delivery config leaves signup open and does not offer resend', async () => {
  register.mockRejectedValue(Object.assign(new Error('Email is not configured'), { code: 'EMAIL_NOT_CONFIGURED' }));
  show(RegisterPage); fillSignup();
  await screen.findByText('Email is not configured');
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
  expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy();
});
test('delivery failure after account creation offers resend recovery', async () => {
  register.mockRejectedValue(Object.assign(new Error('Delivery failed'), { verificationPending: true }));
  show(RegisterPage); fillSignup();
  expect(await screen.findByRole('button', { name: 'Resend confirmation' })).toBeTruthy();
});
test('login offers resend only after correct credentials identify an unverified account', async () => {
  login.mockRejectedValue(Object.assign(new Error('Confirm your email'), { code: 'EMAIL_UNVERIFIED' }));
  show(LoginPage);
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'collector@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByRole('button', { name: 'Resend confirmation' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'other@gmail.com' } });
  expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
});
