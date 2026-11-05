import { afterEach, test, expect, vi } from 'vitest';
import { apiFetch } from './api';
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const response = (body, currency) => ({ ok:true, headers:{get:()=>currency}, json:async()=>body });
test('legacy USD read responses become VND exactly once',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response([{price:25}])).mockResolvedValueOnce(response([{price:625000,currency:'VND'}])));
  expect((await apiFetch('/products'))[0].price).toBe(625000);
  expect((await apiFetch('/products'))[0].price).toBe(625000);
});
test('commerce writes wait for a VND-capable backend before sending any mutation',async()=>{
  const fetch=vi.fn().mockResolvedValue(response({},null));vi.stubGlobal('fetch',fetch);
  await expect(apiFetch('/products',{method:'POST',body:'{}'})).rejects.toThrow('đang cập nhật');
  expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][0]).toMatch(/\/health$/);
});
test('VND-capable backend permits a commerce update',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response({},'VND')).mockResolvedValueOnce(response({price:625000,currency:'VND'}));vi.stubGlobal('fetch',fetch);
  expect((await apiFetch('/products/id',{method:'PUT',body:JSON.stringify({price:625000,currency:'VND'})})).price).toBe(625000);
  expect(fetch).toHaveBeenCalledTimes(2);
});
