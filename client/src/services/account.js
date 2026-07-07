const KEY = 'lastship_account';

export function loadAccount() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export function saveAccount(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearAccount() {
  localStorage.removeItem(KEY);
}

export async function fetchMe(token) {
  try {
    const res = await fetch(`/api/auth/me?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function apiRegister(name, pin) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin }),
  });
  return res.json();
}

export async function apiLogin(name, pin) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin }),
  });
  return res.json();
}
