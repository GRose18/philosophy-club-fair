'use client';

import { useEffect, useState } from 'react';
import {AccountAccess,SignOut,useAccount} from '@/components/account-access';
import MemberDirectory from '@/components/member-directory';
import WorksheetComposer from '@/components/worksheet-composer';
import MaterialComposer from '@/components/material-composer';
import { BookOpen, CheckCircle2, Download, FileText, LayoutDashboard, Link2, LockKeyhole, MessageCircleMore, Plus, Users, Video } from 'lucide-react';

const mainNav = [
  ['Overview', LayoutDashboard], ['Members', Users], ['Resources', BookOpen], ['Worksheets', FileText], ['Videos', Video],
] as const;

const speakers = [
  { name:'Maya Chen', initials:'MC', color:'#287a5d', time:'04:18' },
  { name:'Leo Alvarez', initials:'LA', color:'#4e6d93', time:'03:42' },
  { name:'Nora Patel', initials:'NP', color:'#a76c37', time:'02:55' },
  { name:'Eli Thompson', initials:'ET', color:'#776492', time:'02:11' },
];

export default function Home() {
  return <AccountAccess admin><AdminDashboard/></AccountAccess>;
}

function AdminDashboard() {
  const account=useAccount();
  const owner=account?.role==='Owner';
  const nav=owner?[...mainNav,['Harkness',MessageCircleMore] as const]:mainNav;
  const [active,setActive]=useState('Overview');
  const [toast,setToast]=useState('');
  const [sessionLive,setSessionLive]=useState(false);
  const show=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),2400)};
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="mark"><span>Philosophy Club</span></div>
      <nav aria-label="Dashboard sections">{nav.map(([label,Icon])=><button key={label} className={active===label?'active':''} onClick={()=>setActive(label)}><Icon size={18}/><span>{label}</span></button>)}</nav>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p>PHILOSOPHY CLUB · 2026–2027</p><h1>{active}</h1></div><div className="account-actions"><span><strong>{account?.fullName}</strong><small>{account?.role}</small></span><SignOut/></div></header>
      {active==='Overview'?<Overview owner={owner} onNavigate={setActive}/>
        :active==='Members'?<MemberDirectory/>
        :active==='Resources'?<MaterialComposer kind="resource" show={show}/>
        :active==='Worksheets'?<WorksheetComposer show={show}/>
        :active==='Videos'?<MaterialComposer kind="video" show={show}/>
        :owner&&active==='Harkness'?<Harkness live={sessionLive} setLive={setSessionLive} show={show}/>
        :<Overview owner={owner} onNavigate={setActive}/>}
    </section>
    {toast&&<div className="toast" role="status"><span>✓</span>{toast}</div>}
  </main>;
}

function Overview({owner,onNavigate}:{owner:boolean;onNavigate:(section:string)=>void}) {
  return <div className="content overview-content">
    <section className="welcome"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>Prepare the next conversation.</h2><p>Publish readings, worksheets, and videos from one focused workspace.</p></div><div className="release-badge"><CheckCircle2/><span><strong>Member portal ready</strong><small>Only published materials are visible</small></span></div></section>
    <div className="release-grid">
      <section className="panel quick"><div className="panel-title"><h3>Create and assign</h3><span>Choose what you want members to receive.</span></div><div className="quick-grid"><button onClick={()=>onNavigate('Resources')}><span className="mint"><Plus/></span><strong>Resource</strong><small>Link or PDF</small></button><button onClick={()=>onNavigate('Worksheets')}><span className="mint"><FileText/></span><strong>Worksheet</strong><small>Questions and guidance</small></button><button onClick={()=>onNavigate('Videos')}><span className="mint"><Video/></span><strong>Video</strong><small>YouTube link or MP4</small></button><button onClick={()=>onNavigate('Members')}><span className="mint"><Users/></span><strong>Members</strong><small>Review account status</small></button></div></section>
      <section className="panel release-checklist"><div className="panel-title"><h3>Before invitations go out</h3><span>A short final check for a clean launch.</span></div><ul><li><CheckCircle2/>Confirm names, emails, and roles</li><li><CheckCircle2/>Publish the first real assignment</li><li><LockKeyhole/>Keep invitation delivery paused until final approval</li></ul></section>
      {owner&&<section className="panel owner-lab"><div><span className="private-label"><LockKeyhole/>OWNER ONLY</span><h3>Harkness tracker</h3><p>The private iPad workspace is still in development. No other account can see it.</p></div><button className="secondary" onClick={()=>onNavigate('Harkness')}>Open private prototype</button></section>}
    </div>
  </div>;
}

function Harkness({live,setLive,show}:{live:boolean;setLive:(value:boolean)=>void;show:(message:string)=>void}) {
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{if(!live)return;const id=window.setInterval(()=>setSeconds(value=>value+1),1000);return()=>clearInterval(id)},[live]);
  const time=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  return <div className="content harkness-page"><section className="session-head"><div><span className="private-label"><LockKeyhole/>OWNER-ONLY DEVELOPMENT</span><h2>Harkness tracker prototype</h2><p>iPad control surface · Local prototype timer {time}</p></div><div><button className="secondary" onClick={()=>show('Summary export will be connected during Harkness development')}><Download size={16}/>Export preview</button><button className={live?'stop':'start'} onClick={()=>setLive(!live)}>{live?'Pause timer':'Start timer'}</button></div></section><div className="harkness-grid"><section className="panel map-panel"><div className="panel-title row"><div><h3>Conversation map</h3><span>Prototype connections between speakers</span></div><small>NOT SYNCED</small></div><div className="spider-map"><svg viewBox="0 0 700 430" role="img" aria-label="Prototype conversation connection map"><g className="links"><line x1="350" y1="80" x2="520" y2="165"/><line x1="520" y1="165" x2="500" y2="330"/><line x1="500" y1="330" x2="220" y2="345"/><line x1="220" y1="345" x2="150" y2="160"/><line x1="150" y1="160" x2="350" y2="80"/><line x1="350" y1="80" x2="500" y2="330"/></g></svg>{speakers.map((member,index)=><div className={`map-person p${index}`} key={member.name}><span style={{background:member.color}}>{member.initials}</span><strong>{member.name.split(' ')[0]}</strong><small>{member.time}</small></div>)}<div className="map-person center"><span>+</span><strong>Add speaker</strong></div></div></section><section className="panel feed"><div className="panel-title"><h3>Facilitator notes</h3><span>Prototype content · private</span></div>{[['Maya Chen','Introduced the veil of ignorance.'],['Leo Alvarez','Connected fairness to unequal starting points.'],['Nora Patel','Raised a counterpoint about merit.']].map((item,index)=><article className="feed-item" key={item[0]}><span style={{background:speakers[index].color}}>{speakers[index].initials}</span><div><strong>{item[0]}</strong><p>{item[1]}</p><i><Link2 size={12}/>Sample connection</i></div></article>)}<div className="prototype-note"><LockKeyhole size={16}/><p><strong>Development boundary</strong>Recording, live sync, automated summaries, and member briefs are not connected yet.</p></div></section></div></div>;
}
