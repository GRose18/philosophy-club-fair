import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const port = Number(process.env.PORT || 10000);
const origin = process.env.APP_ORIGIN || "https://philosophy-ews.onrender.com";
const publicAppUrl = process.env.PUBLIC_APP_URL || origin;
const sessionSecret = process.env.SESSION_SECRET;
const aiModel = process.env.OPENAI_MODEL || "gpt-5-mini";
const generationWindows = new Map();

const json = (res,status,body,headers={}) => {
  res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":origin,"access-control-allow-credentials":"true","access-control-allow-headers":"content-type,x-automation-key,x-file-name,x-material-kind",...headers});
  res.end(JSON.stringify(body));
};
const readBody = async req => {
  let raw=""; for await (const chunk of req) { raw+=chunk; if(raw.length>100000) throw new Error("Request too large"); }
  return raw ? JSON.parse(raw) : {};
};
const hashToken = value => crypto.createHash("sha256").update(value).digest("hex");
const isHttpsUrl = value => { try { return new URL(value).protocol==='https:'; } catch { return false; } };
const readBinary = async(req,maxBytes) => {
  const declared=Number(req.headers['content-length']||0);
  if(declared>maxBytes)throw new Error('FILE_TOO_LARGE');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw new Error('FILE_TOO_LARGE');chunks.push(chunk);}
  return Buffer.concat(chunks);
};
const passwordHash = password => new Promise((resolve,reject)=>{
  const salt=crypto.randomBytes(16);
  crypto.scrypt(password,salt,64,(err,key)=>err?reject(err):resolve(`${salt.toString("hex")}:${key.toString("hex")}`));
});
const verifyPassword = (password,stored) => new Promise((resolve,reject)=>{
  const [salt,expected]=stored.split(":");
  crypto.scrypt(password,Buffer.from(salt,"hex"),64,(err,key)=>err?reject(err):resolve(crypto.timingSafeEqual(key,Buffer.from(expected,"hex"))));
});
const encodeSession = user => {
  if (!sessionSecret) throw new Error("SESSION_SECRET is not configured");
  const payload=Buffer.from(JSON.stringify({id:user.id,exp:Date.now()+1000*60*60*24*7})).toString("base64url");
  const signature=crypto.createHmac("sha256",sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const decodeSession = value => {
  if(!value||!sessionSecret) return null;
  const [payload,signature]=value.split(".");
  if(!payload||!signature) return null;
  const expected=crypto.createHmac("sha256",sessionSecret).update(payload).digest();
  const received=Buffer.from(signature,"base64url");
  if(expected.length!==received.length||!crypto.timingSafeEqual(expected,received)) return null;
  try { const session=JSON.parse(Buffer.from(payload,"base64url").toString());
  return session.exp>Date.now()?session:null; } catch {return null;}
};
const cookieValue = req => (req.headers.cookie||"").split(";").map(v=>v.trim()).find(v=>v.startsWith("philosophy_session="))?.split("=")[1];
const hasAutomationKey=req=>Boolean(process.env.AUTOMATION_KEY)&&req.headers['x-automation-key']===process.env.AUTOMATION_KEY;
async function currentUser(req){
  const session=decodeSession(cookieValue(req));
  if(!session)return null;
  return (await pool.query("SELECT id,username,full_name,role FROM users WHERE id=$1 AND status='active'",[session.id])).rows[0]||null;
}
const isAdmin=user=>Boolean(user)&&['Owner','Admin'].includes(user.role);
function canGenerate(userId){
  const now=Date.now(), recent=(generationWindows.get(userId)||[]).filter(time=>now-time<60*60*1000);
  if(recent.length>=12)return false;
  recent.push(now);generationWindows.set(userId,recent);return true;
}

async function migrate(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('Owner','Admin','Student')),
    password_hash TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS invitations (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS content_items (
    id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('worksheet','discussion_questions')),
    title TEXT NOT NULL, content JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
    created_by BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_kind_check`);
  await pool.query(`ALTER TABLE content_items ADD CONSTRAINT content_items_kind_check CHECK (kind IN ('worksheet','discussion_questions','resource','video'))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS content_files (
    id BIGSERIAL PRIMARY KEY, original_name TEXT NOT NULL, mime_type TEXT NOT NULL,
    data BYTEA NOT NULL, created_by BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`INSERT INTO users(email,username,full_name,role,status)
    VALUES('trickshotseytan@gmail.com','test','Test Account','Student','pending')
    ON CONFLICT(email) DO UPDATE SET username='test', full_name='Test Account', role='Student'`);
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==="OPTIONS") return json(res,204,{});
    const url=new URL(req.url,"http://localhost");
    if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'Origin not allowed'});
    if(req.method==='POST'&&url.pathname==='/auth/logout')return json(res,200,{ok:true},{'set-cookie':'philosophy_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'});
    if(req.method==='POST'&&url.pathname==='/admin/bootstrap-owner'){
      if(!hasAutomationKey(req))return json(res,401,{error:'Unauthorized'});
      const {email}=await readBody(req);
      if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{error:'Valid email required'});
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
        const existing=(await client.query("SELECT id FROM users WHERE role='Owner'")).rows;
        if(existing.length){await client.query('ROLLBACK');return json(res,409,{error:'Owner already exists'});}
        await client.query("INSERT INTO users(email,username,full_name,role,status) VALUES($1,'grose','Gabe Rose','Owner','pending')",[email.toLowerCase()]);
        await client.query('COMMIT');
        return json(res,201,{ok:true,username:'grose',role:'Owner',status:'pending'});
      }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    }
    if(req.method==="GET"&&url.pathname==="/health") return json(res,200,{ok:true});
    if(req.method==="POST"&&url.pathname==="/ai/compose"){
      const actor=await currentUser(req);
      if(!isAdmin(actor))return json(res,403,{error:"Administrator access required"});
      if(!process.env.OPENAI_API_KEY)return json(res,503,{error:"AI Composer needs an OpenAI API key in Render"});
      if(!canGenerate(actor.id))return json(res,429,{error:"Generation limit reached. Try again later."});
      const {kind='worksheet',topic,source='',level='High school',questionCount=6}=await readBody(req);
      if(!['worksheet','discussion_questions'].includes(kind)||typeof topic!=="string"||topic.trim().length<3||topic.length>300||typeof source!=="string"||source.length>12000)
        return json(res,400,{error:"Add a topic and keep source material under 12,000 characters"});
      const count=Math.max(3,Math.min(12,Number(questionCount)||6));
      const schema={type:'object',additionalProperties:false,properties:{title:{type:'string'},introduction:{type:'string'},questions:{type:'array',minItems:count,maxItems:count,items:{type:'object',additionalProperties:false,properties:{question:{type:'string'},guidance:{type:'string'}},required:['question','guidance']}}},required:['title','introduction','questions']};
      const prompt=`Create a ${kind==='worksheet'?'student worksheet':'Harkness discussion guide'} for ${level} philosophy club students. Topic: ${topic.trim()}\nNumber of questions: ${count}\n${source.trim()?`Source material supplied by the administrator:\n${source.trim()}`:'Use established philosophical concepts; do not invent quotations or citations.'}`;
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:aiModel,store:false,instructions:'You are a careful philosophy educator. Write clear, open-ended prompts that reward reasoning, counterarguments, and textual support. Avoid answer-key language and unsupported quotations.',input:prompt,max_output_tokens:1800,safety_identifier:crypto.createHash('sha256').update(String(actor.id)).digest('hex'),text:{format:{type:'json_schema',name:'philosophy_composer',strict:true,schema}}})});
      const result=await response.json();
      if(!response.ok){console.error('OpenAI error',result?.error?.code||response.status);return json(res,502,{error:result?.error?.message||'AI generation failed'});}
      const outputText=result.output_text||result.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text;
      if(!outputText)return json(res,502,{error:'AI returned no draft'});
      return json(res,200,{ok:true,draft:JSON.parse(outputText),model:aiModel});
    }
    if(req.method==="POST"&&url.pathname==="/ai/material"){
      const actor=await currentUser(req);
      if(!isAdmin(actor))return json(res,403,{error:"Administrator access required"});
      if(!process.env.OPENAI_API_KEY)return json(res,503,{error:"AI Composer needs an OpenAI API key in Render"});
      if(!canGenerate(actor.id))return json(res,429,{error:"Generation limit reached. Try again later."});
      const {kind,sourceType,sourceUrl='',fileName='',notes='',title=''}=await readBody(req);
      if(!['resource','video'].includes(kind)||!['link','file'].includes(sourceType)||typeof notes!=='string'||notes.length>8000||typeof title!=='string'||title.length>180)
        return json(res,400,{error:'Check the source details and try again'});
      if(sourceType==='link'&&!isHttpsUrl(sourceUrl))return json(res,400,{error:'A complete https:// link is required'});
      if(sourceType==='file'&&(typeof fileName!=='string'||!fileName.trim()))return json(res,400,{error:'Choose a file first'});
      const schema={type:'object',additionalProperties:false,properties:{title:{type:'string'},summary:{type:'string'},instructions:{type:'string'}},required:['title','summary','instructions']};
      const sourceDescription=sourceType==='link'?`Link supplied by the administrator: ${sourceUrl}`:`Uploaded filename: ${fileName}`;
      const prompt=`Prepare student-facing fields for a philosophy club ${kind}. ${sourceDescription}\n${title.trim()?`Working title: ${title.trim()}\n`:''}${notes.trim()?`Administrator notes or excerpt:\n${notes.trim()}`:'No descriptive notes were supplied. Stay general and do not invent the source contents.'}`;
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:aiModel,store:false,instructions:'You are a careful philosophy educator. Create a concise accurate title, a 2-4 sentence summary, and clear preparation instructions. Use only the information supplied. Never claim to have opened a link or inspected a file, and never invent quotations, speakers, arguments, or citations.',input:prompt,max_output_tokens:900,safety_identifier:crypto.createHash('sha256').update(String(actor.id)).digest('hex'),text:{format:{type:'json_schema',name:'material_composer',strict:true,schema}}})});
      const result=await response.json();
      if(!response.ok){console.error('OpenAI error',result?.error?.code||response.status);return json(res,502,{error:result?.error?.message||'AI generation failed'});}
      const outputText=result.output_text||result.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text;
      if(!outputText)return json(res,502,{error:'AI returned no draft'});
      return json(res,200,{ok:true,draft:JSON.parse(outputText),model:aiModel});
    }
    if(req.method==="POST"&&url.pathname==="/admin/uploads"){
      const actor=await currentUser(req);
      if(!isAdmin(actor))return json(res,403,{error:"Administrator access required"});
      const kind=req.headers['x-material-kind'];
      const mime=req.headers['content-type']?.split(';')[0];
      if(!['resource','video'].includes(kind))return json(res,400,{error:'Invalid material type'});
      if((kind==='resource'&&mime!=='application/pdf')||(kind==='video'&&mime!=='video/mp4'))return json(res,415,{error:kind==='resource'?'Only PDF files are accepted':'Only MP4 files are accepted'});
      let originalName='upload';try{originalName=decodeURIComponent(String(req.headers['x-file-name']||'upload'));}catch{}
      originalName=originalName.replace(/[\r\n]/g,' ').slice(0,220);
      let data;try{data=await readBinary(req,(kind==='video'?40:15)*1024*1024);}catch(error){if(error.message==='FILE_TOO_LARGE')return json(res,413,{error:`File must be ${kind==='video'?40:15} MB or smaller`});throw error;}
      if(!data.length)return json(res,400,{error:'The selected file is empty'});
      const uploaded=(await pool.query('INSERT INTO content_files(original_name,mime_type,data,created_by) VALUES($1,$2,$3,$4) RETURNING id',[originalName,mime,data,actor.id])).rows[0];
      return json(res,201,{ok:true,id:Number(uploaded.id),name:originalName,mimeType:mime});
    }
    if(req.method==="POST"&&url.pathname==="/admin/content"){
      const actor=await currentUser(req);
      if(!isAdmin(actor))return json(res,403,{error:"Administrator access required"});
      const body=await readBody(req);
      const {kind,title}=body;
      if(typeof title!=='string'||!title.trim())return json(res,400,{error:'A title is required'});
      let content;
      if(['worksheet','discussion_questions'].includes(kind)){
        const {introduction,questions}=body;
        if(typeof introduction!=='string'||!Array.isArray(questions)||questions.length<1)return json(res,400,{error:'Complete the introduction and questions'});
        content={introduction,questions};
      }else if(['resource','video'].includes(kind)){
        const {summary,instructions,sourceType,sourceUrl='',fileId=null,fileName=''}=body;
        if(typeof summary!=='string'||!summary.trim()||typeof instructions!=='string'||!instructions.trim()||!['link','file'].includes(sourceType))return json(res,400,{error:'Complete the summary and instructions'});
        if(sourceType==='link'&&!isHttpsUrl(sourceUrl))return json(res,400,{error:'A complete https:// link is required'});
        if(sourceType==='file'){
          const owned=(await pool.query('SELECT id FROM content_files WHERE id=$1 AND created_by=$2',[fileId,actor.id])).rows[0];
          if(!owned)return json(res,400,{error:'Upload the file before publishing'});
        }
        content={summary:summary.trim(),instructions:instructions.trim(),sourceType,sourceUrl:sourceType==='link'?sourceUrl:'',fileId:sourceType==='file'?Number(fileId):null,fileName:sourceType==='file'?String(fileName).slice(0,220):''};
      }else return json(res,400,{error:'Invalid content type'});
      const item=(await pool.query("INSERT INTO content_items(kind,title,content,status,created_by) VALUES($1,$2,$3,'published',$4) RETURNING id,created_at",[kind,title.trim(),content,actor.id])).rows[0];
      return json(res,201,{ok:true,id:item.id,status:'published',createdAt:item.created_at});
    }
    if(req.method==="GET"&&url.pathname==="/content"){
      const actor=await currentUser(req);
      if(!actor)return json(res,401,{error:'Not signed in'});
      const rows=(await pool.query("SELECT id,kind,title,content,created_at FROM content_items WHERE status='published' ORDER BY created_at DESC")).rows;
      return json(res,200,{ok:true,items:rows.map(item=>({id:Number(item.id),kind:item.kind,title:item.title,...item.content,createdAt:item.created_at}))});
    }
    if(req.method==="GET"&&url.pathname.startsWith('/content-files/')){
      const actor=await currentUser(req);
      if(!actor)return json(res,401,{error:'Not signed in'});
      const id=Number(url.pathname.split('/').pop());
      if(!Number.isSafeInteger(id)||id<1)return json(res,404,{error:'File not found'});
      const file=(await pool.query(`SELECT f.original_name,f.mime_type,f.data FROM content_files f JOIN content_items c ON (c.content->>'fileId')::bigint=f.id WHERE f.id=$1 AND c.status='published'`,[id])).rows[0];
      if(!file)return json(res,404,{error:'File not found'});
      const total=file.data.length,range=req.headers.range;
      const headers={'content-type':file.mime_type,'content-disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,'accept-ranges':'bytes','access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
      if(range){const match=/bytes=(\d+)-(\d*)/.exec(range);if(match){const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):total-1,total-1);if(start<=end&&start<total){res.writeHead(206,{...headers,'content-range':`bytes ${start}-${end}/${total}`,'content-length':end-start+1});return res.end(file.data.subarray(start,end+1));}}}
      res.writeHead(200,{...headers,'content-length':total});return res.end(file.data);
    }
    if(req.method==="GET"&&url.pathname==="/admin/users"){
      const actor=await currentUser(req);
      if(!hasAutomationKey(req)&&!['Owner','Admin'].includes(actor?.role)) return json(res,403,{error:"Administrator access required"});
      const users=(await pool.query("SELECT email,username,full_name,role,status FROM users ORDER BY role,full_name")).rows;
      return json(res,200,{count:users.length,users:users.map(user=>({email:user.email,username:user.username,fullName:user.full_name,role:user.role,status:user.status}))});
    }
    if(req.method==="POST"&&url.pathname==="/admin/users/import"){
      if(!process.env.AUTOMATION_KEY||req.headers["x-automation-key"]!==process.env.AUTOMATION_KEY) return json(res,401,{error:"Unauthorized"});
      const {users}=await readBody(req);
      if(!Array.isArray(users)||users.length>250) return json(res,400,{error:"A users array with at most 250 entries is required"});
      const client=await pool.connect();
      try {
        await client.query("BEGIN");
        for(const user of users){
          if(!user.email||!user.username||!user.fullName||!['Admin','Student'].includes(user.role)) throw new Error("Invalid roster entry");
          await client.query(`INSERT INTO users(email,username,full_name,role,status) VALUES($1,$2,$3,$4,'pending')
            ON CONFLICT(email) DO UPDATE SET username=EXCLUDED.username,full_name=EXCLUDED.full_name,role=EXCLUDED.role`,
            [user.email,user.username,user.fullName,user.role]);
        }
        await client.query("COMMIT");
      } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
      return json(res,200,{ok:true,imported:users.length,invitationsCreated:0,emailsSent:0});
    }
    if(req.method==="POST"&&url.pathname==="/admin/invitations"){
      if(!process.env.AUTOMATION_KEY||req.headers["x-automation-key"]!==process.env.AUTOMATION_KEY) return json(res,401,{error:"Unauthorized"});
      const {email}=await readBody(req);
      const user=(await pool.query("SELECT id,email,username,full_name,role FROM users WHERE lower(email)=lower($1)",[email])).rows[0];
      if(!user) return json(res,404,{error:"Account not found"});
      await pool.query("UPDATE invitations SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[user.id]);
      const token=crypto.randomBytes(32).toString("base64url");
      await pool.query("INSERT INTO invitations(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '24 hours')",[user.id,hashToken(token)]);
      return json(res,201,{email:user.email,username:user.username,fullName:user.full_name,role:user.role,activationUrl:`${publicAppUrl}/activate?token=${token}`,expiresInHours:24});
    }
    if(req.method==="POST"&&url.pathname==="/auth/activate"){
      const {token,password}=await readBody(req);
      if(typeof password!=="string"||password.length<12) return json(res,400,{error:"Password must be at least 12 characters"});
      const invite=(await pool.query(`SELECT i.id,u.id user_id FROM invitations i JOIN users u ON u.id=i.user_id
        WHERE i.token_hash=$1 AND i.used_at IS NULL AND i.expires_at>NOW()`,[hashToken(token||"")])).rows[0];
      if(!invite) return json(res,400,{error:"Invalid or expired invitation"});
      const client=await pool.connect();
      try { await client.query("BEGIN"); await client.query("UPDATE users SET password_hash=$1,status='active' WHERE id=$2",[await passwordHash(password),invite.user_id]); await client.query("UPDATE invitations SET used_at=NOW() WHERE id=$1",[invite.id]); await client.query("COMMIT"); }
      catch(e){await client.query("ROLLBACK");throw e} finally {client.release()}
      return json(res,200,{ok:true});
    }
    if(req.method==="POST"&&url.pathname==="/auth/login"){
      const {username,password}=await readBody(req);
      const user=(await pool.query("SELECT id,username,full_name,role,password_hash,status FROM users WHERE lower(username)=lower($1)",[username||""])).rows[0];
      if(typeof username!=='string'||typeof password!=='string'||password.length>1024)return json(res,400,{error:'Invalid credentials'});
      if(!user||user.status!=='active'||!user.password_hash||!(await verifyPassword(password,user.password_hash))) return json(res,401,{error:"Invalid username or password"});
      const session=encodeSession(user);
      return json(res,200,{ok:true,user:{username:user.username,fullName:user.full_name,role:user.role}},{"set-cookie":`philosophy_session=${session}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`});
    }
    if(req.method==="GET"&&url.pathname==="/auth/me"){
      const session=decodeSession(cookieValue(req));
      if(!session) return json(res,401,{error:"Not signed in"});
      const user=(await pool.query("SELECT username,full_name,role,status FROM users WHERE id=$1",[session.id])).rows[0];
      if(!user||user.status!=="active") return json(res,401,{error:"Not signed in"});
      return json(res,200,{ok:true,user:{username:user.username,fullName:user.full_name,role:user.role}});
    }
    return json(res,404,{error:"Not found"});
  }catch(error){console.error(error);return json(res,500,{error:"Server error"});}
});

migrate().then(()=>server.listen(port,"0.0.0.0",()=>console.log(`API listening on ${port}`))).catch(error=>{console.error(error);process.exit(1)});
