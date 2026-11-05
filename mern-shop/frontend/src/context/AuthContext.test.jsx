import { afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
vi.mock('../utils/api', () => ({ apiFetch: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.resetAllMocks(); });
function Probe() {
  const { register, user } = useAuth();
  return <><button onClick={() => register('Collector', 'collector@gmail.com', 'password123', '0912345678')}>Create</button><span>{user?.email || 'Signed out'}</span></>;
}
test('registration signs in and persists the returned session without verification', async () => {
  apiFetch.mockResolvedValue({ email: 'collector@gmail.com', token: 'test-token', emailVerified: false });
  render(<AuthProvider><Probe /></AuthProvider>);
  fireEvent.click(screen.getByText('Create'));
  expect(await screen.findByText('collector@gmail.com')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('userInfo')).token).toBe('test-token');
});
