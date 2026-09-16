'use client';
import {useEffect,useState} from 'react';
import {API,useAccount} from './account-access';
type Member={username:string;fullName:string;email:string;role:string;status:string};
export default function MemberDirectory(){
  const account=useAccount();
  const [sending,setSending]=useState(''),[notice,setNotice]=useState('');
  const [attempted,setAttempted]=useState<string[]>([]);
  async function sendInvitation(member:Member){
    if(sending)return;
    const warning=member.status==='active'?' This account is already active; the link will let its owner set a new password.':'';
    if(!window.confirm(`Send one Philosophy Club invitation to ${member.email} from philosophyclub.ews@gmail.com?${warning} No other member will be emailed.`))return;
    setSending(member.email);setNotice('');setAttempted(current=>[...current,member.email]);
    try{
      const response=await fetch(`${API}/admin/invitations/send`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({email:member.email,requestId:crypto.randomUUID(),confirmed:true})});
      const data=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok||!data.ok)throw new Error(data.error||'Delivery could not be confirmed. Check the sender’s Sent mail before retrying.');
      setNotice(`Google accepted the invitation for ${member.email}. Ask them to check Inbox and Spam. The activation link expires in 24 hours.`);
    }catch(error){setNotice(error instanceof Error?error.message:'Delivery could not be confirmed. Check Sent mail before retrying.');}finally{setSending('');}
  }
  const [members,setMembers]=useState<Member[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
  useEffect(()=>{fetch(`${API}/admin/users`,{credentials:'include'}).then(async response=>{
    const data=await response.json() as {error?:string;users:Member[]};if(!response.ok)throw new Error(data.error||'Could not load members');setMembers(data.users);
  }).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  const filtered=members.filter(m=>`${m.fullName} ${m.username} ${m.email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="content"><section className="library-head"><div><p className="eyebrow">PEOPLE & ACCESS</p><h2>Members</h2><p>{members.length} accounts · {members.filter(m=>m.status==='pending').length} awaiting activation</p></div></section>
    <section className="panel member-panel"><label>Find a member <input aria-label="Find a member" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, username, or email"/></label><p>{account?.role==='Owner'?'Send individual invitations from philosophyclub.ews@gmail.com. Nothing is sent until you click Send invitation and confirm the recipient.':'Only the club owner can send invitations.'}</p>
    {notice&&<p className="invitation-notice" role="status">{notice}</p>}
    {loading&&<p role="status">Loading members…</p>}{error&&<p role="alert">{error}</p>}
    {filtered.map(m=><div className="member-entry" key={m.username}><div className="member-row"><span>{m.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><div><strong>{m.fullName}</strong><small>{m.username} · {m.email}</small></div><b>{m.role}</b><small className={`account-status ${m.status}`}>{m.status==='active'?'Active':'Pending'}</small></div>{account?.role==='Owner'&&m.role!=='Owner'&&<div className="member-invite-action"><button className="secondary" disabled={Boolean(sending)||attempted.includes(m.email)} onClick={()=>void sendInvitation(m)}>{sending===m.email?'Sending…':attempted.includes(m.email)?'Send attempted — see status above':'Send invitation'}</button></div>}</div>)}
    {!loading&&!error&&!filtered.length&&<p>No members match your search.</p>}</section></div>
}
