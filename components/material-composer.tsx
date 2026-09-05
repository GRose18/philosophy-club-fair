'use client';

import {useRef,useState} from 'react';
import {BookOpen,FileUp,Link2,Upload,Video} from 'lucide-react';
import {API} from './account-access';

type MaterialKind='resource'|'video';
type Draft={title:string;summary:string;instructions:string};

export default function MaterialComposer({kind,show}:{kind:MaterialKind;show:(message:string)=>void}){
  const isVideo=kind==='video';
  const [sourceType,setSourceType]=useState<'link'|'file'>('link');
  const [url,setUrl]=useState('');
  const [file,setFile]=useState<File|null>(null);
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
      <section className="panel composer-form">
        <fieldset className="source-switch"><legend>Source</legend><button type="button" className={sourceType==='link'?'selected':''} onClick={()=>chooseType('link')}><Link2/> {isVideo?'YouTube or web link':'Web link'}</button><button type="button" className={sourceType==='file'?'selected':''} onClick={()=>chooseType('file')}><FileUp/> {isVideo?'MP4 upload':'PDF upload'}</button></fieldset>
        {sourceType==='link'?<label>{isVideo?'YouTube or video URL':'Resource URL'}<input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder={isVideo?'https://youtube.com/watch?v=…':'https://plato.stanford.edu/entries/…'}/></label>:<div className="upload-field"><span>{isVideo?<Video/>:<BookOpen/>}</span><strong>{file?file.name:`Choose ${isVideo?'an MP4':'a PDF'}`}</strong><small>{file?`${(file.size/1024/1024).toFixed(1)} MB`:`Up to ${maxMb} MB`}</small><input ref={fileInput} type="file" accept={accepted} onChange={e=>selectFile(e.target.files?.[0]||null)}/><button className="secondary" type="button" onClick={()=>fileInput.current?.click()}><Upload/> {file?'Replace file':'Browse files'}</button></div>}
        {error&&<div className="auth-alert" role="alert">{error}</div>}
        <p className="composer-note">Choose the source here, then write the student-facing title, summary, and instructions alongside it.</p>
      </section>
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
