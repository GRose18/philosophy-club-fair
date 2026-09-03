'use client';

import { FormEvent, useState } from 'react';

const apiBase = 'https://philosophy-ews-api.onrender.com';

export default function LoginPage() {
  const [username,setUsername]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function login(event:FormEvent){
    event.preventDefault(); setError(''); setBusy(true);
    try{
      const response=await fetch(`${apiBase}/auth/login`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'Sign in failed');
      window.location.href=data.user.role==='Student'?'/student':'/';
    }catch(e){setError(e instanceof Error?e.message:'Sign in failed')}finally{setBusy(false)}
  }
  return <main className="auth-page"><section className="auth-card">
    <p className="auth-kicker">Philosophy Club</p><h1>Welcome back</h1><p className="auth-intro">Sign in with the username from your invitation.</p>
    <form className="auth-form" onSubmit={login}>{error&&<div className="auth-alert" role="alert">{error}</div>}
      <label>Username<input autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. jberger"/></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button className="auth-submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    </form><p className="auth-note">Need an invitation? Contact the club administrator.</p>
  </section></main>;
}
