'use client';
import {useEffect,useState} from 'react';
import {API} from './account-access';
type Member={username:string;fullName:string;email:string;role:string;status:string};
export default function MemberDirectory(){
  const [members,setMembers]=useState<Member[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
  useEffect(()=>{fetch(`${API}/admin/users`,{credentials:'include'}).then(async response=>{
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load members');setMembers(data.users);
  }).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  const filtered=members.filter(m=>`${m.fullName} ${m.username} ${m.email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="content"><section className="library-head"><div><p className="eyebrow">PEOPLE & ACCESS</p><h2>Members</h2><p>{members.length} accounts · {members.filter(m=>m.status==='pending').length} awaiting activation</p></div></section>
    <section className="panel member-panel"><label>Find a member <input aria-label="Find a member" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, username, or email"/></label><p>Invitation email delivery is not connected yet. No invitations are sent from this page.</p>
    {loading&&<p role="status">Loading members…</p>}{error&&<p role="alert">{error}</p>}
    {filtered.map(m=><div className="member-row" key={m.username}><span style={{background:'#168374'}}>{m.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><div><strong>{m.fullName}</strong><small>{m.username} · {m.email}</small></div><b>{m.role}</b><small>{m.status==='active'?'Active':'Pending'}</small><button disabled title="Email delivery needs to be configured">Send invitation</button></div>)}
    {!loading&&!error&&!filtered.length&&<p>No members match your search.</p>}</section></div>
}
