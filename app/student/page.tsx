'use client';

import {useEffect,useState} from 'react';
import {AccountAccess,API,SignOut,useAccount} from '@/components/account-access';
import {ArrowUpRight,BookOpen,FileText,Video} from 'lucide-react';
import {Button} from '@/components/ui/button';

const tabs=[['My assignments',BookOpen],['Readings',BookOpen],['Worksheets',FileText],['Videos',Video]] as const;

export default function StudentPage(){return <AccountAccess><StudentDashboard/></AccountAccess>}

function StudentDashboard(){
  const account=useAccount();
  const [tab,setTab]=useState('My assignments');
  const [worksheet,setWorksheet]=useState<string|null>(null);
  const [published,setPublished]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let disposed=false;fetch(`${API}/content`,{credentials:'include'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load assignments');if(!disposed)setPublished(data.items||[])}).catch(reason=>{if(!disposed)setError(reason.message)}).finally(()=>{if(!disposed)setLoading(false)});return()=>{disposed=true}},[]);
  const items=published.map(item=>({id:`published-${item.id}`,type:item.kind==='resource'?'Readings':item.kind==='video'?'Videos':'Worksheets',title:item.title,source:item.sourceType==='file'?(item.fileName||'Uploaded file'):(item.sourceUrl||'Philosophy Club'),detail:item.summary||item.introduction||'',instructions:item.instructions||'',label:item.kind==='resource'?'READING':item.kind==='video'?'VIDEO':'WORKSHEET',Icon:item.kind==='resource'?BookOpen:item.kind==='video'?Video:FileText,url:item.sourceType==='file'&&item.fileId?`${API}/content-files/${item.fileId}`:item.sourceUrl,questions:item.questions||[]}));
  const visible=items.filter(item=>tab==='My assignments'||item.type===tab);
  const firstName=account?.fullName?.split(' ')[0]||'there';
  return <main className="student-shell"><header className="student-header"><strong>Philosophy Club</strong><div><span>{account?.fullName}</span><SignOut/></div></header><nav className="student-tabs" aria-label="Member sections">{tabs.map(([name,Icon])=><Button key={name} variant="ghost" className={tab===name?'selected':''} aria-pressed={tab===name} onClick={()=>setTab(name)}><Icon/>{name}</Button>)}</nav><div className="student-content"><div className="student-context"><span>Academic year 2026–2027</span><span className="preview-label">Member portal</span></div><section className="student-heading"><div><p>PHILOSOPHY CLUB</p><h1>Welcome, {firstName}.</h1><span>Everything published for your next discussion will appear here.</span></div></section>{loading?<section className="student-card empty-member-state"><h3>Loading assignments…</h3></section>:error?<section className="student-card empty-member-state" role="alert"><h3>Assignments are unavailable</h3><p>{error}</p></section>:visible.length?<><div className="student-list-title"><h2>{tab}</h2><span>{visible.length} assigned</span></div><section className="student-assignments">{visible.map((item:any)=><article className={`student-card ${item.type.toLowerCase()}`} key={item.id}><div className="student-card-top"><span className="type-pill"><item.Icon size={17}/>{item.label}</span></div><h3>{item.title}</h3><p className="student-source">{item.source}</p>{item.detail&&<p>{item.detail}</p>}{item.instructions&&<p><strong>Instructions:</strong> {item.instructions}</p>}<div className="student-card-actions">{item.url?<a className="student-action" href={item.url} target="_blank" rel="noreferrer">{item.type==='Readings'?'Open resource':'Watch video'}<ArrowUpRight size={17}/></a>:<Button className="student-action" onClick={()=>setWorksheet(worksheet===item.id?null:item.id)}>{worksheet===item.id?'Close worksheet':'View worksheet'}<ArrowUpRight/></Button>}</div>{item.type==='Worksheets'&&worksheet===item.id&&<div className="worksheet-preview"><h4>Discussion questions</h4>{item.questions.map((question:any,index:number)=><article key={`${item.id}-${index}`}><strong>{index+1}.</strong><p>{question.question}</p>{question.guidance&&<small>{question.guidance}</small>}</article>)}</div>}</article>)}</section></>:<section className="student-card empty-member-state"><BookOpen/><h3>No assignments yet</h3><p>Your club administrator has not published anything for this section.</p></section>}</div></main>;
}
