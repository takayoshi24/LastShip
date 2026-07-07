import { useState } from 'react';
import { apiLogin, apiRegister, saveAccount } from '../services/account.js';

export default function AccountModal({ onClose, onAccount }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? apiLogin : apiRegister;
      const data = await fn(name.trim(), pin);
      if (data.error) { setError(data.error); return; }
      saveAccount(data);
      onAccount(data);
      onClose();
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="info-backdrop" onClick={onClose}>
      <div className="account-modal" onClick={e => e.stopPropagation()}>
        <div className="info-header">
          <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
          <button className="info-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="account-form">
          <label className="account-field">
            <span>Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="2–20 characters"
              maxLength={20}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="account-field">
            <span>PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="4–8 digits"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="account-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading || !name || pin.length < 4}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <button type="button" className="btn-ghost account-switch"
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
