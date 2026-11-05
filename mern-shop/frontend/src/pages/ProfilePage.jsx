import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { normalizePhone, validAccountPhone } from '../utils/commerce-rules';
import Loader, { Message } from '../components/UI';
export default function ProfilePage() {
  const { updateProfile } = useAuth();
  const [form,setForm] = useState({name:'',phone:'',email:''}), [loading,setLoading] = useState(true), [saving,setSaving] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  useEffect(() => { apiFetch('/users/profile').then(setForm).catch(err=>setError(err.message)).finally(()=>setLoading(false)); },[]);
  const save = async event => {
    event.preventDefault();setError('');setNotice('');
    if (!validAccountPhone(form.phone) || form.name.trim().length < 2) {setError('Vui lòng nhập họ tên và số điện thoại hợp lệ.');return;}
    setSaving(true);
    try { const data=await updateProfile(form.name.trim(),normalizePhone(form.phone));setForm(data);setNotice('Đã cập nhật thông tin tài khoản.'); }
    catch(err){setError(err.message);}finally{setSaving(false);}
  };
  if(loading)return <Loader/>;
  return <div className="page container auth-page"><div className="card auth-card"><h1>Tài khoản của tôi</h1>
    {error&&<Message variant="error">{error}</Message>}{notice&&<div role="status"><Message variant="success">{notice}</Message></div>}
    <form onSubmit={save} noValidate>
      <label>Email<input className="input" value={form.email||''} readOnly type="email"/></label>
      <label>Họ và tên<input className="input" required maxLength={100} autoComplete="name" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Số điện thoại<input className="input" required type="tel" maxLength={20} autoComplete="tel" placeholder="0912345678" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <button className="btn btn-primary btn-block" disabled={saving}>{saving?'Đang lưu…':'Lưu thông tin'}</button>
    </form>
  </div></div>;
}
