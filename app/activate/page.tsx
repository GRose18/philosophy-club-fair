'use client';

import { FormEvent, useEffect, useState } from 'react';

const apiBase = 'https://philosophy-ews-api.onrender.com';

export default function ActivatePage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') || ''), []);

  async function activate(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!token) return setError('This invitation link is incomplete. Ask an administrator for a new one.');
    if (password.length < 12) return setError('Use at least 12 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/auth/activate`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,password})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Activation failed');
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Activation failed'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <p className="auth-kicker">Philosophy Club</p><h1>Activate your account</h1>
    <p className="auth-intro">Create a private password to access your club assignments and resources.</p>
    {done ? <div className="auth-success">Your account is ready.<br/><a href="/login">Continue to sign in →</a></div> :
      <form className="auth-form" onSubmit={activate}>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        <label>New password<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters"/></label>
        <label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        <button className="auth-submit" disabled={busy}>{busy?'Activating…':'Activate account'}</button>
      </form>}
  </section></main>;
}
