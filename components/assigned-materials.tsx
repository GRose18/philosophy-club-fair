'use client';
import {useEffect,useState} from 'react';
import {API} from './account-access';
type Material={id:number;kind:string;title:string;lessonTitle?:string;summary?:string;introduction?:string;instructions?:string;sourceType?:string;sourceUrl?:string;fileId?:number;createdAt:string;questions?:{question:string;guidance?:string}[]};
export default function AssignedMaterials(){
 const [mail,setMail]=useState<{ready:boolean;reason?:string;counts:{status:string;count:number}[]}|null>(null);
 const [items,setItems]=useState<Material[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState<number|null>(null),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let disposed=false;
  const timer=setTimeout(()=>controller.abort(),60000);
  fetch(`${API}/admin/notification-status`,{credentials:'include',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('Status unavailable');return await response.json() as {ready:boolean;reason?:string;counts:{status:string;count:number}[]};}).then(data=>{if(!disposed)setMail(data)}).catch(()=>{if(!disposed)setMail({ready:false,reason:'Email status unavailable. Refresh to check.',counts:[]})});
  fetch(`${API}/content`,{credentials:'include',cache:'no-store',signal:controller.signal}).then(async response=>{
   const data=await response.json() as {items:Material[];error?:string};
   if(!response.ok)throw new Error(data.error||'Unable to load materials');
   if(!disposed){setItems(data.items);setError('');}
  }).catch(e=>{if(!disposed)setError(e.name==='AbortError'?'The server took too long. Please refresh.':e.message)}).finally(()=>{clearTimeout(timer);if(!disposed)setLoading(false)});
  return()=>{disposed=true;clearTimeout(timer);controller.abort()};
 },[revision]);
 async function remove(item:Material){
  if(busy!==null||!window.confirm(`Remove “${item.title}” from assignments for the entire club? Students will no longer see it after refreshing. The stored material will not be permanently deleted.`))return;
  setBusy(item.id);setError('');setNotice('');
  try{
   const response=await fetch(`${API}/admin/content/${item.id}/unpublish`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({confirmed:true})});
   const data=await response.json() as {error?:string};
   if(!response.ok)throw new Error(data.error||'Unable to remove material');
   setItems(current=>current.filter(material=>material.id!==item.id));setNotice(`“${item.title}” was removed from the club’s assignments.`);
  }catch(e){setError(e instanceof Error?e.message:'Removal could not be confirmed. Refresh before trying again.')}finally{setBusy(null)}
 }
 const lessons=new Map<string,Material[]>();
 items.forEach(item=>{const lesson=item.lessonTitle?.trim()||'Club reading & discussion';lessons.set(lesson,[...(lessons.get(lesson)||[]),item])});
 return <div className="content assigned-manager"><section className="inbox-heading"><div><p className="eyebrow">PUBLISHED TO THE CLUB</p><h2>Assigned materials</h2><p>Review everything students can see. Removing a material unpublishes it for everyone.</p></div><button className="secondary" disabled={loading||busy!==null} onClick={()=>{setLoading(true);setRevision(value=>value+1)}}>Refresh</button></section>
 <aside className="invitation-notice"><strong>Assignment email alerts</strong><p>{mail?(mail.ready?'The sender supports assignment alerts. New publications queue an individual email for every active account.':mail.reason):'Checking email service…'}</p>{mail&&mail.counts.length>0&&<p>{mail.counts.map(item=>`${item.count} ${item.status}`).join(' · ')}</p>}<small>Previously published materials do not trigger new emails. Pending accounts are excluded. Refresh to check delivery status.</small></aside>
 {notice&&<p className="invitation-notice" role="status">{notice}</p>}{error&&<p className="auth-alert" role="alert">{error}</p>}
 {loading?<p role="status">Loading assigned materials…</p>:!items.length&&!error?<section className="assignment-empty"><h3>No published materials</h3><p>Publish a reading, worksheet, or video to assign it to the club.</p></section>:Array.from(lessons,([name,materials])=><section className="lesson-panel" key={name}><header className="lesson-heading"><h2>{name}</h2><span className="lesson-count">{materials.length} materials</span></header>{materials.map(item=>{const url=item.sourceType==='file'&&item.fileId?`${API}/content-files/${item.fileId}`:item.sourceUrl;return <article className="assigned-material" key={item.id}><div className="assigned-material-heading"><div><span className="material-kind">{item.kind==='video'?'Video':item.kind==='resource'?'Reading':'Worksheet'} · Published {new Date(item.createdAt).toLocaleDateString()}</span><h3>{item.title}</h3></div><button className="secondary remove-material" disabled={busy!==null} onClick={()=>void remove(item)}>{busy===item.id?'Removing…':'Remove from club'}</button></div><p className="material-summary">{item.summary||item.introduction}</p>{item.instructions&&<div className="material-instructions"><strong>Student instructions</strong><p>{item.instructions}</p></div>}{url&&/^https:\/\//i.test(url)&&<a className="material-open" href={url} target="_blank" rel="noopener noreferrer">Open resource ↗</a>}{item.questions&&<details className="assignment-questions"><summary>Review worksheet · {item.questions.length} questions</summary><ol>{item.questions.map((question,index)=><li key={index}><p>{question.question}</p>{question.guidance&&<small>{question.guidance}</small>}</li>)}</ol></details>}</article>})}</section>)}
 </div>;
}
