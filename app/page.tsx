'use client';

import { useEffect, useState } from 'react';
import {AccountAccess,SignOut,useAccount} from '@/components/account-access';
import MemberDirectory from '@/components/member-directory';
import AIComposer from '@/components/ai-composer';
import { BookOpen, CircleUserRound, Clock3, Download, FileText, LayoutDashboard, Link2, MessageCircleMore, Plus, Search, Settings, Sparkles, Upload, Users, Video, WandSparkles } from 'lucide-react';

const nav = [
  ['Overview', LayoutDashboard], ['Members', Users], ['Resources', BookOpen], ['Worksheets', FileText], ['Videos', Video], ['Harkness', MessageCircleMore],
] as const;

const members = [
  { name:'Maya Chen', initials:'MC', color:'#ef9e62', time:'04:18', comments:8 },
  { name:'Leo Alvarez', initials:'LA', color:'#9b8fc9', time:'03:42', comments:6 },
  { name:'Nora Patel', initials:'NP', color:'#77a8a0', time:'02:55', comments:5 },
  { name:'Eli Thompson', initials:'ET', color:'#d5828d', time:'02:11', comments:4 },
];

export default function Home() {
  return <AccountAccess admin><AdminDashboard/></AccountAccess>;
}
function AdminDashboard() {
  const account=useAccount();
  const [active, setActive] = useState('Overview');
  const [toast, setToast] = useState('');
  const [sessionLive, setSessionLive] = useState(true);
  const show = (message:string) => { setToast(message); window.setTimeout(()=>setToast(''), 2400); };
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="mark"><span>Philosophy Club</span><a className="view-link" href="/student">Preview student view ↗</a></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'active':''} onClick={()=>setActive(label)}><Icon size={18}/><span>{label}</span>{label==='Harkness'&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom"><button><Settings size={18}/>Settings</button><div className="user"><span>GR</span><div><strong>Gabe Rose</strong><small>Club Administrator</small></div><b>⌄</b></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="mobile-brand">Φ</div><div><p>PHILOSOPHY CLUB · ACADEMIC YEAR 2026–2027</p><h1>{active}</h1></div><div className="header-actions"><label><Search size={17}/><input aria-label="Search" placeholder="Search anything…"/><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Account"><CircleUserRound size={20}/></button></div></header>
      <div style={{padding:'12px 28px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{account?.fullName} · {account?.role}</span><SignOut/></div>
      {active==='Overview' ? <Overview onNavigate={setActive} show={show}/> : active==='Members'? <MemberDirectory/> : active==='Worksheets'? <AIComposer show={show}/> : active==='Harkness' ? <Harkness live={sessionLive} setLive={setSessionLive} show={show}/> : <SectionPage title={active} show={show}/>}
    </section>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </main>
}

function Overview({onNavigate,show}:{onNavigate:(s:string)=>void;show:(s:string)=>void}) {
  return <div className="content">
    <section className="welcome"><div><p className="eyebrow">GOOD AFTERNOON, GABE</p><h2>Ready to get people <em>thinking?</em></h2><p>Your club is all set for today’s discussion on justice and the good life.</p></div><div className="next-meeting"><small>NEXT MEETING</small><strong>Today · 4:00 PM</strong><span>Room 214 <b>•</b> 12 members expected</span></div></section>
    <section className="metrics">
      <article><div className="metric-icon coral"><Users size={20}/></div><div><strong>24</strong><span>Active members</span></div><small>+3 this month</small></article>
      <article><div className="metric-icon violet"><BookOpen size={20}/></div><div><strong>18</strong><span>Resources shared</span></div><small>5 this week</small></article>
      <article><div className="metric-icon sage"><MessageCircleMore size={20}/></div><div><strong>7</strong><span>Harkness sessions</span></div><small>12h 38m total</small></article>
      <article><div className="metric-icon gold"><Clock3 size={20}/></div><div><strong>92%</strong><span>Participation rate</span></div><small className="up">↗ 8%</small></article>
    </section>
    <div className="dashboard-grid">
      <section className="panel current"><div className="panel-head"><div><span className="live-dot"/>LIVE NOW</div><button onClick={()=>onNavigate('Harkness')}>Open Harkness ↗</button></div><h3>What makes a society just?</h3><p className="subtle">Harkness Discussion · Started 18 minutes ago</p><div className="speaker-row">{members.map((m,i)=><div key={m.name} className="speaker"><span style={{background:m.color}}>{m.initials}</span><div><strong>{m.name}</strong><small>{m.time} spoken</small></div><b style={{height:`${48-i*7}%`,background:m.color}}/></div>)}</div><div className="mini-transcript"><Sparkles size={16}/><p><strong>AI live insight</strong><br/>The group is connecting Rawls’s veil of ignorance to unequal access in education.</p><span>JUST NOW</span></div></section>
      <section className="panel quick"><div className="panel-title"><h3>Quick actions</h3><span>Most used tools</span></div><div className="quick-grid"><button onClick={()=>show('Resource composer opened')}><span className="peach"><Plus/></span><strong>Assign resource</strong><small>Article, link, or PDF</small></button><button onClick={()=>onNavigate('Worksheets')}><span className="lilac"><WandSparkles/></span><strong>Generate worksheet</strong><small>AI-assisted prompts</small></button><button onClick={()=>show('Video assignment created')}><span className="mint"><Video/></span><strong>Assign video</strong><small>Share with the club</small></button><button onClick={()=>onNavigate('Members')}><span className="sand"><Users/></span><strong>Add members</strong><small>Import a signup list</small></button></div></section>
      <section className="panel assignments"><div className="panel-title row"><div><h3>Recently assigned</h3><span>Resources your members are working through</span></div><button onClick={()=>onNavigate('Resources')}>View all</button></div><Assignment icon={<BookOpen/>} tint="peach" title="The Original Position" source="Stanford Encyclopedia of Philosophy" due="DUE SEP 8" progress="18 of 24 viewed" pct={75}/><Assignment icon={<Video/>} tint="lilac" title="Justice: What’s the Right Thing to Do?" source="Harvard · Michael Sandel" due="DUE SEP 12" progress="9 of 24 viewed" pct={38}/><Assignment icon={<FileText/>} tint="mint" title="Thought Experiment: The Experience Machine" source="Worksheet · 8 questions" due="DUE SEP 15" progress="4 of 24 completed" pct={17}/></section>
      <section className="panel activity"><div className="panel-title"><h3>Club activity</h3><span>The latest from your community</span></div>{[['NP','Nora completed','The Original Position','8m','#77a8a0'],['LA','Leo commented on','Free Will & Moral Responsibility','24m','#9b8fc9'],['ET','Eli joined','Philosophy Club','1h','#d5828d'],['MC','Maya submitted','Experience Machine Worksheet','3h','#ef9e62']].map(a=><div className="activity-row" key={a[1]+a[2]}><span style={{background:a[4]}}>{a[0]}</span><p><strong>{a[1]}</strong><br/>{a[2]}</p><small>{a[3]}</small></div>)}</section>
    </div>
  </div>
}

function Assignment({icon,tint,title,source,due,progress,pct}:{icon:React.ReactNode;tint:string;title:string;source:string;due:string;progress:string;pct:number}) {return <div className="assignment"><span className={tint}>{icon}</span><div><strong>{title}</strong><small>{source}</small></div><i>{due}</i><div className="progress"><b style={{width:`${pct}%`}}/><span>{progress}</span></div><button aria-label="More options">•••</button></div>}

function Harkness({live,setLive,show}:{live:boolean;setLive:(v:boolean)=>void;show:(s:string)=>void}) {
  const [seconds,setSeconds]=useState(18*60+42);
  useEffect(()=>{if(!live)return;const id=window.setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[live]);
  const time=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  return <div className="content harkness-page"><section className="session-head"><div><span>{live?'● RECORDING':'● PAUSED'}</span><h2>What makes a society just?</h2><p>Live Harkness · Room 214 · {time}</p></div><div><button className="secondary" onClick={()=>show('Discussion summary downloaded')}><Download size={16}/> Download summary</button><button className={live?'stop':'start'} onClick={()=>setLive(!live)}>{live?'Pause session':'Resume session'}</button></div></section><div className="harkness-grid"><section className="panel map-panel"><div className="panel-title row"><div><h3>Conversation map</h3><span>Connections appear as members respond to one another</span></div><small>12 MEMBERS · 31 CONNECTIONS</small></div><div className="spider-map"><svg viewBox="0 0 700 430" role="img" aria-label="Live conversation connection map"><g className="links"><line x1="350" y1="80" x2="520" y2="165"/><line x1="520" y1="165" x2="500" y2="330"/><line x1="500" y1="330" x2="220" y2="345"/><line x1="220" y1="345" x2="150" y2="160"/><line x1="150" y1="160" x2="350" y2="80"/><line x1="350" y1="80" x2="500" y2="330"/><line x1="520" y1="165" x2="220" y2="345"/><line x1="150" y1="160" x2="500" y2="330"/></g></svg>{members.map((m,i)=><div className={`map-person p${i}`} key={m.name}><span style={{background:m.color}}>{m.initials}</span><strong>{m.name.split(' ')[0]}</strong><small>{m.time}</small></div>)}<div className="map-person center"><span>+8</span><strong>Others</strong></div></div></section><section className="panel feed"><div className="panel-title"><h3>Live discussion feed</h3><span><i className="live-dot"/> AI-assisted transcript</span></div>{[['Maya Chen','“If we don’t know our place in society, wouldn’t we naturally choose fairer rules?”','Rawls · veil of ignorance'],['Leo Alvarez','“But is equal opportunity enough if people begin from radically unequal positions?”','Connects to Maya'],['Nora Patel','“That assumes justice is mainly about distribution. Aristotle might ask what each person deserves.”','Counterpoint · Aristotle']].map((f,i)=><article className="feed-item" key={f[0]}><span style={{background:members[i].color}}>{members[i].initials}</span><div><strong>{f[0]} <small>{18-i*3}:4{2-i}</small></strong><p>{f[1]}</p><i><Link2 size={12}/>{f[2]}</i></div></article>)}<div className="ai-summary"><Sparkles size={16}/><p><strong>Live synthesis</strong>The discussion is contrasting procedural fairness with distributive justice and merit.</p></div></section></div></div>
}

function SectionPage({title,show}:{title:string;show:(s:string)=>void}) {
  if(title==='Members') return <Members show={show}/>;
  const descriptions:Record<string,string>={Resources:'Curate readings, links, and reference material for the club.',Worksheets:'Create discussion-ready worksheets with AI-assisted questions.',Videos:'Assign talks, lectures, and documentaries to members.'};
  return <div className="content"><section className="library-head"><div><p className="eyebrow">CLUB LIBRARY</p><h2>{title}</h2><p>{descriptions[title]}</p></div><button className="primary" onClick={()=>show(`${title.slice(0,-1)} composer opened`)}><Plus size={17}/> Add {title.slice(0,-1).toLowerCase()}</button></section><section className="panel empty-state"><span><Upload size={28}/></span><h3>Your {title.toLowerCase()} workspace is ready</h3><p>Add your first item or use the AI composer to build one from a topic.</p><button className="secondary" onClick={()=>show('AI composer ready')}><Sparkles size={16}/> Create with AI</button></section></div>
}

function Members({show}:{show:(s:string)=>void}) {const [generated,setGenerated]=useState(false);return <div className="content"><section className="library-head"><div><p className="eyebrow">PEOPLE & ACCESS</p><h2>Members</h2><p>Import a signup list to create usernames and one-time passcodes.</p></div><button className="primary" onClick={()=>setGenerated(true)}><Upload size={17}/> Import signup list</button></section><section className="panel member-panel"><div className="panel-title row"><div><h3>Pending onboarding</h3><span>Usernames use first initial + last name automatically</span></div><button className="secondary" onClick={()=>{setGenerated(true);show('Fresh OTPs generated')}}><WandSparkles size={15}/> Generate OTPs</button></div>{members.map((m,i)=><div className="member-row" key={m.name}><span style={{background:m.color}}>{m.initials}</span><div><strong>{m.name}</strong><small>{m.name[0].toLowerCase()+m.name.split(' ')[1].toLowerCase()}</small></div><b>Member</b><code>{generated?['784 219','406 883','951 247','638 105'][i]:'••• •••'}</code><button onClick={()=>show(`Invite copied for ${m.name}`)}>Copy invite</button></div>)}</section></div>}
