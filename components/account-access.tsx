'use client';
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
export const API = 'https://philosophy-ews-api.onrender.com';
type Account = {username:string;fullName:string;role:'Owner'|'Admin'|'Student'};
const Context=createContext<Account|null>(null);
export const useAccount=()=>useContext(Context);
export function AccountAccess({children,admin=false}:{children:ReactNode;admin?:boolean}){
  const [account,setAccount]=useState<Account|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let disposed=false;fetch(`${API}/auth/me`,{credentials:'include'}).then(async response=>{
    if(response.status===401){window.location.replace('/login');return;}
    if(!response.ok)throw new Error('Unable to check your account. Please retry.');
    const {user}=await response.json();
    if(admin&&user.role==='Student'){window.location.replace('/student');return;}
    if(!disposed)setAccount(user);
  }).catch(e=>{if(!disposed)setError(e.message)});return()=>{disposed=true}},[admin]);
  if(!account)return <main className="auth-page"><section className="auth-card"><h1>Philosophy Club</h1><p role="status">{error||'Checking your account…'}</p>{error&&<button className="auth-submit" onClick={()=>window.location.reload()}>Retry</button>}</section></main>;
  return <Context.Provider value={account}>{children}</Context.Provider>;
}
export function SignOut(){return <button className="secondary" onClick={async()=>{
  const response=await fetch(`${API}/auth/logout`,{method:'POST',credentials:'include'});
  if(response.ok)window.location.replace('/login');else window.alert('Unable to sign out. Please retry.');
}}>Sign out</button>}
