const memory = new Map();
const storageKey = 'l4lGuestOrderAccess';
export function guestTokenFor(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}')[id];
    return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
  } catch { return undefined; }
}
export function saveGuestAccess(id, token) {
  if (!/^[a-f0-9]{24}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Mã tra cứu không hợp lệ.');
  memory.set(id, token);
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({ ...previous, [id]: token }));
  } catch { /* The receipt remains available in this tab; show its backup code. */ }
}
