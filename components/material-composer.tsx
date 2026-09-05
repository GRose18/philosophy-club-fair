'use client';

import {FormEvent,useRef,useState} from 'react';
import {BookOpen,FileUp,Link2,Sparkles,Upload,Video} from 'lucide-react';
import {API} from './account-access';

type MaterialKind='resource'|'video';
type Draft={title:string;summary:string;instructions:string};

export default function MaterialComposer({kind,show}:{kind:MaterialKind;show:(message:string)=>void}){
  const isVideo=kind==='video';
  const [sourceType,setSourceType]=useState<'link'|'file'>('link');
  const [url,setUrl]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [notes,setNotes]=useState('');
  const [draft,setDraft]=useState<Draft>({title:'',summary:'',instructions:''});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [published,setPublished]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const label=isVideo?'Video':'Resource';
  const accepted=isVideo?'video/mp4':'application/pdf';
  const maxMb=isVideo?40:15;

  function chooseType(type:'link'|'file'){
    setSourceType(type);setError('');setPublished(false);
  }
  function selectFile(next:File|null){
    if(!next){setFile(null);return;}
    if(next.type!==accepted){setError(`Choose ${isVideo?'an MP4 video':'a PDF document'}.`);return;}
    if(next.size>maxMb*1024*1024){setError(`File must be ${maxMb} MB or smaller.`);return;}
    setFile(next);setError('');
    if(!draft.title)setDraft(current=>({...current,title:next.name.replace(/\.[^.]+$/,'')}));
  }
  async function generate(event:FormEvent){
    event.preventDefault();setBusy(true);setError('');setPublished(false);
    try{
      if(sourceType==='link'&&!/^https:\/\//i.test(url))throw new Error('Paste a complete https:// link.');
      if(sourceType==='file'&&!file)throw new Error(`Choose ${isVideo?'an MP4 file':'a PDF file'} first.`);
      const response=await fetch(`${API}/ai/material`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({kind,sourceType,sourceUrl:url,fileName:file?.name||'',notes,title:draft.title})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Generation failed');setDraft(data.draft);
    }catch(e){setError(e instanceof Error?e.message:'Generation failed')}finally{setBusy(false)}
  }
  async function publish(){
    setBusy(true);setError('');
    try{
      if(!draft.title.trim()||!draft.summary.trim()||!draft.instructions.trim())throw new Error('Complete the title, summary, and instructions.');
      let fileId:null|number=null;
      if(sourceType==='file'){
        if(!file)throw new Error(`Choose ${isVideo?'an MP4 file':'a PDF file'} first.`);
        const upload=await fetch(`${API}/admin/uploads`,{method:'POST',credentials:'include',headers:{'content-type':file.type,'x-file-name':encodeURIComponent(file.name),'x-material-kind':kind},body:file});
        const uploadData=await upload.json();if(!upload.ok)throw new Error(uploadData.error||'Upload failed');fileId=uploadData.id;
      }else if(!/^https:\/\//i.test(url))throw new Error('Paste a complete https:// link.');
      const response=await fetch(`${API}/admin/content`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({kind,...draft,sourceType,sourceUrl:sourceType==='link'?url:'',fileId,fileName:file?.name||''})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Publish failed');setPublished(true);show(`${label} published to the club`);
    }catch(e){setError(e instanceof Error?e.message:'Publish failed')}finally{setBusy(false)}
  }

  return <div className="content composer-page material-page">
    <section className="library-head"><div><p className="eyebrow">{isVideo?'VIDEO COMPOSER':'RESOURCE COMPOSER'}</p><h2>{isVideo?'Assign something worth watching':'Share something worth reading'}</h2><p>{isVideo?'Add a YouTube link or upload an MP4, then prepare the context students need.':'Add a web resource or PDF, then prepare the context students need.'}</p></div></section>
    <div className="composer-grid">
      <form className="panel composer-form" onSubmit={generate}>
        <fieldset className="source-switch"><legend>Source</legend><button type="button" className={sourceType==='link'?'selected':''} onClick={()=>chooseType('link')}><Link2/> {isVideo?'YouTube or web link':'Web link'}</button><button type="button" className={sourceType==='file'?'selected':''} onClick={()=>chooseType('file')}><FileUp/> {isVideo?'MP4 upload':'PDF upload'}</button></fieldset>
        {sourceType==='link'?<label>{isVideo?'YouTube or video URL':'Resource URL'}<input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder={isVideo?'https://youtube.com/watch?v=…':'https://plato.stanford.edu/entries/…'}/></label>:<div className="upload-field"><span>{isVideo?<Video/>:<BookOpen/>}</span><strong>{file?file.name:`Choose ${isVideo?'an MP4':'a PDF'}`}</strong><small>{file?`${(file.size/1024/1024).toFixed(1)} MB`:`Up to ${maxMb} MB`}</small><input ref={fileInput} type="file" accept={accepted} onChange={e=>selectFile(e.target.files?.[0]||null)}/><button className="secondary" type="button" onClick={()=>fileInput.current?.click()}><Upload/> {file?'Replace file':'Browse files'}</button></div>}
        <label>Title <small>Optional before AI</small><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} maxLength={180} placeholder={isVideo?'e.g. Justice: What’s the Right Thing to Do?':'e.g. The Original Position'}/></label>
        <label>Notes for the AI <small>Recommended</small><textarea rows={8} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={8000} placeholder="Paste an abstract, transcript excerpt, key ideas, or what you want students to focus on…"/></label>
        {error&&<div className="auth-alert" role="alert">{error}</div>}
        <button className="primary composer-generate" disabled={busy}><Sparkles/>{busy?'Creating…':'Create fields with AI'}</button>
        <p className="composer-note">AI uses the title, link, filename, and notes you provide. It does not inspect uploaded file contents. Review every claim before publishing.</p>
      </form>
      <section className="panel composer-draft material-draft">
        <div className="panel-title row"><div><span>EDITABLE {label.toUpperCase()} DRAFT</span><h3>Student-facing details</h3></div>{published&&<b className="published-pill">Published</b>}</div>
        <label>Title<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} maxLength={180} placeholder={`${label} title`}/></label>
        <label>Summary<textarea rows={7} value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})} maxLength={3000} placeholder="What students should know about this source…"/></label>
        <label>Instructions<textarea rows={7} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} maxLength={3000} placeholder="What students should do before the meeting…"/></label>
        <div className="source-preview"><span>{sourceType==='link'?<Link2/>:<FileUp/>}</span><div><strong>{sourceType==='link'?(url||'No link added yet'):(file?.name||'No file selected')}</strong><small>{sourceType==='link'?'Opens in a new tab':`${label} upload`}</small></div></div>
        <div className="composer-actions"><button className="secondary" type="button" onClick={()=>{setDraft({title:'',summary:'',instructions:''});setPublished(false)}}>Clear draft</button><button className="primary" type="button" disabled={busy||published} onClick={publish}>{busy?'Publishing…':published?'Published':'Publish to club'}</button></div>
        <p className="composer-note publish-note">Nothing is shared with students until you press Publish to club.</p>
      </section>
    </div>
  </div>;
}
