'use client';

import {useState} from 'react';
import {Minus,Plus} from 'lucide-react';
import {API} from './account-access';

type Question={question:string;guidance:string};
type Draft={title:string;introduction:string;questions:Question[]};
const blankQuestion=():Question=>({question:'',guidance:''});

export default function WorksheetComposer({show}:{show:(message:string)=>void}){
  const [draft,setDraft]=useState<Draft>({title:'',introduction:'',questions:[blankQuestion(),blankQuestion(),blankQuestion()]});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[published,setPublished]=useState(false);
  function updateQuestion(index:number,field:keyof Question,value:string){
    setDraft(current=>({...current,questions:current.questions.map((item,i)=>i===index?{...item,[field]:value}:item)}));setPublished(false);
  }
  async function publish(){
    setBusy(true);setError('');
    try{
      if(!draft.title.trim()||!draft.introduction.trim()||draft.questions.some(item=>!item.question.trim()))throw new Error('Complete the title, introduction, and every question.');
      const response=await fetch(`${API}/admin/content`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'worksheet',...draft})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Publish failed');setPublished(true);show('Worksheet published to the club');
    }catch(e){setError(e instanceof Error?e.message:'Publish failed')}finally{setBusy(false)}
  }
  return <div className="content composer-page">
    <section className="library-head"><div><p className="eyebrow">WORKSHEET BUILDER</p><h2>Build a thoughtful worksheet</h2><p>Write the context and questions students need, then review everything before publishing.</p></div></section>
    <div className="composer-grid worksheet-builder">
      <section className="panel composer-form">
        <label>Title<input value={draft.title} onChange={e=>{setDraft({...draft,title:e.target.value});setPublished(false)}} maxLength={180} placeholder="e.g. The Experience Machine"/></label>
        <label>Introduction<textarea rows={12} value={draft.introduction} onChange={e=>{setDraft({...draft,introduction:e.target.value});setPublished(false)}} maxLength={4000} placeholder="Introduce the reading, thought experiment, or central question…"/></label>
        <p className="composer-note">Nothing is shared with students until you press Publish to club.</p>
      </section>
      <section className="panel composer-draft">
        <div className="panel-title row"><div><span>EDITABLE WORKSHEET</span><h3>Questions and guidance</h3></div>{published&&<b className="published-pill">Published</b>}</div>
        <div className="draft-questions">{draft.questions.map((q,i)=><article key={i}><strong>{i+1}</strong><label>Question<textarea rows={3} value={q.question} onChange={e=>updateQuestion(i,'question',e.target.value)} placeholder="Ask an open-ended question…"/></label><label>Teacher guidance <small>Optional</small><input value={q.guidance} onChange={e=>updateQuestion(i,'guidance',e.target.value)} placeholder="What a strong response might consider…"/></label>{draft.questions.length>1&&<button className="remove-question" type="button" aria-label={`Remove question ${i+1}`} onClick={()=>{setDraft(current=>({...current,questions:current.questions.filter((_,j)=>j!==i)}));setPublished(false)}}><Minus/></button>}</article>)}</div>
        <button className="secondary add-question" type="button" onClick={()=>{setDraft(current=>({...current,questions:[...current.questions,blankQuestion()]}));setPublished(false)}}><Plus/> Add question</button>
        {error&&<div className="auth-alert" role="alert">{error}</div>}
        <div className="composer-actions"><button className="secondary" type="button" onClick={()=>{setDraft({title:'',introduction:'',questions:[blankQuestion(),blankQuestion(),blankQuestion()]});setPublished(false);setError('')}}>Clear worksheet</button><button className="primary" type="button" disabled={busy||published} onClick={publish}>{busy?'Publishing…':published?'Published':'Publish to club'}</button></div>
      </section>
    </div>
  </div>;
}
