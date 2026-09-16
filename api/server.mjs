import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";
import {MAILER_URL,startAssignmentMailer,mailerReadiness} from './assignment-mailer.mjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const port = Number(process.env.PORT || 10000);
const origin = process.env.APP_ORIGIN || "https://philosophy-ews.onrender.com";
const publicAppUrl = process.env.PUBLIC_APP_URL || origin;
const sessionSecret = process.env.SESSION_SECRET;

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
  await pool.query(`CREATE TABLE IF NOT EXISTS inbox_messages (
    id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES users(id),
    sender_id BIGINT NOT NULL REFERENCES users(id), body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS inbox_student_idx ON inbox_messages(student_id,id)');
  await pool.query(`CREATE TABLE IF NOT EXISTS invitation_deliveries (
    request_id UUID PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id),
    created_by BIGINT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS assignment_email_jobs (
    id BIGSERIAL PRIMARY KEY,content_id BIGINT NOT NULL REFERENCES content_items(id),user_id BIGINT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',last_error TEXT NOT NULL DEFAULT '',
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(content_id,user_id)
  )`);
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
    if(url.pathname==='/inbox'&&['GET','POST'].includes(req.method)){
      const actor=await currentUser(req);
      if(!actor)return json(res,401,{error:'Not signed in'});
      const admin=isAdmin(actor);
      const studentId=admin?url.searchParams.get('student'):String(actor.id);
      if(req.method==='GET'&&admin&&!studentId){
        const threads=(await pool.query(`SELECT DISTINCT ON (m.student_id) m.student_id AS id,u.full_name AS name,m.body AS preview,m.created_at AS "updatedAt" FROM inbox_messages m JOIN users u ON u.id=m.student_id ORDER BY m.student_id,m.id DESC`)).rows;
        threads.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
        return json(res,200,{threads});
      }
      if(!studentId||!/^\d+$/.test(studentId))return json(res,400,{error:'Choose a conversation'});
      if(admin){
        const student=(await pool.query("SELECT id FROM users WHERE id=$1 AND role='Student'",[studentId])).rows[0];
        if(!student)return json(res,404,{error:'Student not found'});
      }
      if(req.method==='POST'){
        const {body}=await readBody(req);
        if(typeof body!=='string'||!body.trim()||body.length>4000)return json(res,400,{error:'Write a message of 1–4,000 characters'});
        const message=(await pool.query('INSERT INTO inbox_messages(student_id,sender_id,body) VALUES($1,$2,$3) RETURNING id',[studentId,actor.id,body.trim()])).rows[0];
        return json(res,201,{ok:true,id:message.id});
      }
      const messages=(await pool.query(`SELECT m.id,m.body,m.created_at AS "createdAt",u.full_name AS name,u.role,(m.sender_id=$2) AS mine FROM inbox_messages m JOIN users u ON u.id=m.sender_id WHERE m.student_id=$1 ORDER BY m.id`,[studentId,actor.id])).rows;
      return json(res,200,{messages});
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
      const lessonTitle=typeof body.lessonTitle==='string'?body.lessonTitle.trim():'';
      if(lessonTitle.length>180)return json(res,400,{error:'Lesson name must be 180 characters or fewer'});
      if(typeof title!=='string'||!title.trim()||title.length>180)return json(res,400,{error:'A title of 1–180 characters is required'});
      let content;
      if(['worksheet','discussion_questions'].includes(kind)){
        const {introduction,questions}=body;
        if(typeof introduction!=='string'||!introduction.trim()||!Array.isArray(questions)||questions.length<1||questions.length>50||questions.some(q=>!q||typeof q.question!=='string'||!q.question.trim()||q.question.length>4000||(q.guidance!==undefined&&typeof q.guidance!=='string')))return json(res,400,{error:'Complete the introduction and up to 50 valid questions'});
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
      content.lessonTitle=lessonTitle;
      const client=await pool.connect();let item,queued;
      try{
        await client.query('BEGIN');
        item=(await client.query("INSERT INTO content_items(kind,title,content,status,created_by) VALUES($1,$2,$3,'published',$4) RETURNING id,created_at",[kind,title.trim(),content,actor.id])).rows[0];
        queued=await client.query("INSERT INTO assignment_email_jobs(content_id,user_id) SELECT $1,id FROM users WHERE status='active' ON CONFLICT DO NOTHING",[item.id]);
        await client.query('COMMIT');
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      return json(res,201,{ok:true,id:item.id,status:'published',createdAt:item.created_at,emailsQueued:queued.rowCount});
    }
    if(req.method==='GET'&&url.pathname==='/admin/notification-status'){
      const actor=await currentUser(req);if(!isAdmin(actor))return json(res,403,{error:'Administrator access required'});
      const readiness=await mailerReadiness();
      const counts=(await pool.query('SELECT status,COUNT(*)::int AS count FROM assignment_email_jobs GROUP BY status')).rows;
      return json(res,200,{...readiness,counts},{'cache-control':'no-store'});
    }
    if(req.method==='POST'&&/^\/admin\/content\/\d+\/unpublish$/.test(url.pathname)){
      const actor=await currentUser(req);
      if(!isAdmin(actor))return json(res,403,{error:'Administrator access required'});
      if(req.headers.origin!==origin)return json(res,403,{error:'Use the club dashboard to remove materials'});
      const id=Number(url.pathname.split('/')[3]);
      if(!Number.isSafeInteger(id)||id<1)return json(res,400,{error:'Invalid material'});
      const body=await readBody(req);
      if(body.confirmed!==true)return json(res,400,{error:'Confirm removal for the whole club'});
      const item=(await pool.query("UPDATE content_items SET status='draft' WHERE id=$1 AND status='published' RETURNING id,title",[id])).rows[0];
      if(!item)return json(res,404,{error:'This material is no longer published'});
      return json(res,200,{ok:true,id:Number(item.id),title:item.title});
    }
    if(req.method==="GET"&&url.pathname==="/content"){
      const actor=await currentUser(req);
      if(!actor)return json(res,401,{error:'Not signed in'});
      const rows=(await pool.query("SELECT id,kind,title,content,created_at FROM content_items WHERE status='published' ORDER BY created_at DESC")).rows;
      return json(res,200,{ok:true,items:rows.map(item=>({id:Number(item.id),kind:item.kind,title:item.title,...item.content,createdAt:item.created_at}))},{'cache-control':'no-store'});
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
    if(req.method==='POST'&&url.pathname==='/admin/invitations/send'){
      const actor=await currentUser(req);
      if(actor?.role!=='Owner')return json(res,403,{error:'Only the club owner can send invitations'});
      if(req.headers.origin!==origin)return json(res,403,{error:'Send invitations from the club dashboard'});
      const body=await readBody(req);
      if(body.confirmed!==true||typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return json(res,400,{error:'Confirm the recipient before sending'});
      const secret=process.env.INVITATION_SECRET;
      if(!secret||secret.length<32)return json(res,503,{error:'Invitation delivery is not configured. Add INVITATION_SECRET to the API service in Render.'});
      const client=await pool.connect();let recipient,token;
      try{
        await client.query('BEGIN');
        recipient=(await client.query('SELECT id,email,username,role,status FROM users WHERE lower(email)=lower($1) FOR UPDATE',[body.email.trim()])).rows[0];
        if(!recipient||recipient.role==='Owner'){await client.query('ROLLBACK');return json(res,400,{error:'Choose an existing student or administrator account'});}
        if(body.pendingOnly===true){
          const delivered=(await client.query("SELECT status FROM invitation_deliveries WHERE user_id=$1 AND status IN ('sent','pending','uncertain') LIMIT 1",[recipient.id])).rows[0];
          if(recipient.status!=='pending'||delivered){await client.query('ROLLBACK');return json(res,200,{ok:true,status:'skipped'});}
        }
        const previous=(await client.query('SELECT user_id,status FROM invitation_deliveries WHERE request_id=$1',[body.requestId])).rows[0];
        if(previous){await client.query('ROLLBACK');if(String(previous.user_id)!==String(recipient.id))return json(res,409,{error:'Request already used for another recipient'});return json(res,previous.status==='sent'?200:409,{ok:previous.status==='sent',status:previous.status,error:previous.status==='sent'?undefined:'This request was already attempted. Check the sender’s Sent mail before trying again.'});}
        const recent=(await client.query("SELECT status FROM invitation_deliveries WHERE user_id=$1 AND (created_at>NOW()-INTERVAL '60 seconds' OR (status IN ('pending','uncertain') AND created_at>NOW()-INTERVAL '24 hours')) LIMIT 1",[recipient.id])).rows[0];
        if(recent){await client.query('ROLLBACK');return json(res,429,{error:'A recent send is already recorded. Check the sender’s Sent mail before sending another invitation.'});}
        token=crypto.randomBytes(32).toString('base64url');
        await client.query("INSERT INTO invitations(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '24 hours')",[recipient.id,hashToken(token)]);
        await client.query("INSERT INTO invitation_deliveries(request_id,user_id,created_by,status) VALUES($1,$2,$3,'pending')",[body.requestId,recipient.id,actor.id]);
        await client.query('COMMIT');
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      let status='uncertain';
      try{
        const response=await fetch(MAILER_URL,{
          method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(45000),
          body:JSON.stringify({action:'invite',secret,requestId:body.requestId,email:recipient.email,username:recipient.username,activationUrl:`${publicAppUrl}/activate?token=${token}`})
        });
        const result=await response.json();
        if(response.ok&&result.ok===true&&result.status==='sent')status='sent';
        else if(['Unauthorized','Invalid invitation','Daily email limit reached','Invalid request'].includes(result.error))status='rejected';
      }catch{/* A timeout does not prove the email was not sent. Never retry automatically. */}
      await pool.query('UPDATE invitation_deliveries SET status=$1 WHERE request_id=$2',[status,body.requestId]);
      if(status==='sent')return json(res,200,{ok:true,status,email:recipient.email});
      return json(res,502,{ok:false,status,error:status==='rejected'?'Google rejected the invitation. Check the shared secret and daily mail quota.':'Delivery could not be confirmed. Check philosophyclub.ews@gmail.com Sent mail; do not immediately resend.'});
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

export {server,pool};
if(process.env.NODE_ENV!=='test')migrate().then(()=>{server.listen(port,"0.0.0.0",()=>console.log(`API listening on ${port}`));startAssignmentMailer(pool);}).catch(error=>{console.error(error);process.exit(1)});
