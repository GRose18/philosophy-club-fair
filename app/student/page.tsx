'use client';

import { useState } from 'react';
import { BookOpen, FileText, Video, MessageCircleMore, ArrowUpRight, Check, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const items = [
  { id:'reading', type:'Readings', title:'The Original Position', source:'Stanford Encyclopedia of Philosophy', detail:'Consider how the veil of ignorance changes the rules we would choose for society.', due:'September 8', label:'READING', Icon:BookOpen, url:'https://plato.stanford.edu/entries/original-position/' },
  { id:'worksheet', type:'Worksheets', title:'The Experience Machine', source:'Thought experiment · 3 reflection questions', detail:'Would you choose a perfectly happy simulation over an imperfect reality?', due:'September 15', label:'WORKSHEET', Icon:FileText },
  { id:'video', type:'Videos', title:'Justice: What’s the Right Thing to Do?', source:'Harvard University · Michael Sandel', detail:'Explore the questions behind moral reasoning before our next discussion.', due:'September 12', label:'VIDEO', Icon:Video, url:'https://www.youtube.com/watch?v=kBdfcR-8hEY' },
];
const tabs = [['My assignments',BookOpen],['Readings',BookOpen],['Worksheets',FileText],['Videos',Video],['Harkness',MessageCircleMore]] as const;

export default function StudentPage() {
  const [tab,setTab]=useState('My assignments');
  const [worksheet,setWorksheet]=useState(false);
  const [answers,setAnswers]=useState(['','','']);
  const [reviewed,setReviewed]=useState<string[]>([]);
  return <main className="student-shell">
    <header className="student-header"><strong>Philosophy Club</strong><div><a href="/">Admin preview ↗</a><span className="student-avatar">MC</span></div></header>
    <nav className="student-tabs" aria-label="Student sections">{tabs.map(([name,Icon])=><Button key={name} variant="ghost" className={tab===name?'selected':''} aria-pressed={tab===name} onClick={()=>setTab(name)}><Icon/>{name}</Button>)}</nav>
    <div className="student-content">
      <div className="student-context"><span>Academic year 2026–2027</span><span className="preview-label">Student preview · sample data</span></div>
      <section className="student-heading"><div><p>YOUR CLUB, YOUR QUESTIONS</p><h1>{tab==='Harkness'?'Follow the conversation.':'A little reading. A bigger perspective.'}</h1><span>{tab==='Harkness'?'Read-only session preview. Recording and transcription are not connected yet.':'Hi Maya. Here’s what to explore before our next discussion.'}</span></div></section>
      {tab==='Harkness'?<StudentHarkness/>:<>
        <section className="student-session"><div><span className="session-pill"><MessageCircleMore size={16}/> HARKNESS PREVIEW</span><h2>What makes a society just?</h2><p>Justice & fairness · Room 214</p></div><Button className="student-action" onClick={()=>setTab('Harkness')}>View discussion <ArrowUpRight/></Button></section>
        <div className="student-list-title"><h2>{tab}</h2><span>{items.filter(i=>tab==='My assignments'||i.type===tab).length} assigned</span></div>
        <section className="student-assignments">{items.filter(i=>tab==='My assignments'||i.type===tab).map(item=><article className={'student-card '+item.id} key={item.id}>
          <div className="student-card-top"><span className="type-pill"><item.Icon size={17}/>{item.label}</span><span className={reviewed.includes(item.id)?'status-pill done':'status-pill'}>{reviewed.includes(item.id)?'Reviewed in this preview':'To explore'}</span><span className="student-due"><Clock3 size={16}/> Due {item.due}</span></div>
          <h3>{item.title}</h3><p className="student-source">{item.source}</p><p>{item.detail}</p>
          <div className="student-card-actions">{item.url?<a className="student-action" href={item.url} target="_blank" rel="noreferrer">{item.id==='reading'?'Open reading':'Watch video'}<ArrowUpRight size={17}/></a>:<Button className="student-action" onClick={()=>setWorksheet(!worksheet)}>{worksheet?'Close worksheet':'Open worksheet'}<ArrowUpRight/></Button>}<Button variant="ghost" className="review-button" onClick={()=>setReviewed(prev=>prev.includes(item.id)?prev.filter(id=>id!==item.id):[...prev,item.id])}><Check/>{reviewed.includes(item.id)?'Undo reviewed':'Mark reviewed'}</Button></div>
          {item.id==='worksheet'&&worksheet&&<div className="worksheet-preview"><h4>The Experience Machine</h4><p>Draft responses here. This preview does not save or submit your work.</p>{['Would you enter the experience machine? Explain your reasons.','What might be valuable about reality beyond how it feels?','Write the strongest objection to your own position.'].map((q,i)=><label key={q}>{i+1}. {q}<textarea value={answers[i]} onChange={e=>setAnswers(prev=>prev.map((a,j)=>i===j?e.target.value:a))} placeholder="Develop your response…" rows={4}/></label>)}</div>}
        </article>)}</section>
        <p className="student-footnote">Preview only. Review marks and worksheet drafts reset when you leave this page.</p>
      </>}
    </div>
  </main>;
}

function StudentHarkness() {
  const people=[{name:'Maya',x:50,y:14,color:'#d95748',time:'4:18'},{name:'Leo',x:84,y:47,color:'#7760c8',time:'3:42'},{name:'Nora',x:69,y:84,color:'#168c91',time:'2:55'},{name:'Eli',x:24,y:80,color:'#b66726',time:'2:11'},{name:'Sam',x:15,y:36,color:'#487dc0',time:'1:36'}];
  return <><div className="student-list-title"><h2>What makes a society just?</h2><span>Sample session · Read only</span></div><div className="student-harkness"><section className="student-card"><h3>Conversation map</h3><p>Who connected with whose ideas</p><div className="student-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Sample discussion connections">{[[0,1],[1,2],[2,3],[3,4],[4,0],[0,2],[1,3]].map(([a,b])=><line key={a+'-'+b} x1={people[a].x} y1={people[a].y} x2={people[b].x} y2={people[b].y} stroke="#a8b6c7" strokeWidth=".35"/>)}</svg>{people.map(p=><div key={p.name} style={{left:p.x+'%',top:p.y+'%'}}><span style={{background:p.color}}>{p.name[0]}</span><strong>{p.name}</strong><small>{p.time}</small></div>)}</div></section><section className="student-card"><h3>Discussion feed</h3><p>Example transcript · not a live recording</p>{[['Maya','If we didn’t know our place in society, would we choose fairer rules?'],['Leo','What if equal opportunity still leaves people with unequal starting points?'],['Nora','Is justice about distributing resources, or about what each person deserves?']].map(([n,q])=><article className="student-feed" key={n}><strong>{n}</strong><p>{q}</p></article>)}<div className="student-synthesis"><strong>Sample synthesis</strong><p>The group is comparing fairness, equal opportunity, and what people deserve.</p></div></section></div></>;
}
