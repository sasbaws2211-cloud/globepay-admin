import React, { useState } from 'react';
import { useAuth } from '../auth';
import { errorMessage } from '../api';
import { Alert, Field } from '../ui';

export default function Login() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(phone, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-dark">
          <span className="brand-mark">G</span>
          <div>
            <div className="brand-name">GlobePay</div>
            <div className="brand-sub">Admin console</div>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Admin accounts only. Use your GlobePay phone number and password.</p>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Phone number">
          <input inputMode="tel" autoComplete="username" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233…" />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
