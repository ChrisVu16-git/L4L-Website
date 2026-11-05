import { afterEach, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ProfilePage from './ProfilePage';
const{apiFetch,updateProfile}=vi.hoisted(()=>({apiFetch:vi.fn(),updateProfile:vi.fn()}));
vi.mock('../utils/api',()=>({apiFetch}));
vi.mock('../context/AuthContext',()=>({useAuth:()=>({updateProfile})}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
test('profile shows a duplicate-phone rejection and leaves the form available',async()=>{
  apiFetch.mockResolvedValue({name:'Nguyễn Văn An',email:'user@example.test',phone:'0912345678'});
  updateProfile.mockRejectedValue(new Error('Số điện thoại đã được sử dụng bởi tài khoản khác.'));
  render(<ProfilePage/>);
  await screen.findByLabelText('Số điện thoại');
  fireEvent.change(screen.getByLabelText('Số điện thoại'),{target:{value:'+84 934 567 890'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu thông tin'}));
  expect(await screen.findByText('Số điện thoại đã được sử dụng bởi tài khoản khác.')).toBeTruthy();
  expect(updateProfile).toHaveBeenCalledWith('Nguyễn Văn An','0934567890');
});
