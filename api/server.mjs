import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const port = Number(process.env.PORT || 10000);
const origin = process.env.APP_ORIGIN || "https://philosophy-ews.onrender.com";
const publicAppUrl = process.env.PUBLIC_APP_URL || origin;
const sessionSecret = process.env.SESSION_SECRET;

const json = (res,status,body,headers={}) => {
  res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":origin,"access-control-allow-credentials":"true","access-control-allow-headers":"content-type,x-automation-key",...headers});
  res.end(JSON.stringify(body));
};
const readBody = async req => {
  let raw=""; for await (const chunk of req) { raw+=chunk; if(raw.length>100000) throw new Error("Request too large"); }
  return raw ? JSON.parse(raw) : {};
};
const hashToken = value => crypto.createHash("sha256").update(value).digest("hex");
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
  const session=JSON.parse(Buffer.from(payload,"base64url").toString());
  return session.exp>Date.now()?session:null;
};
const cookieValue = req => (req.headers.cookie||"").split(";").map(v=>v.trim()).find(v=>v.startsWith("philosophy_session="))?.split("=")[1];

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
  await pool.query(`INSERT INTO users(email,username,full_name,role,status)
    VALUES('trickshotseytan@gmail.com','test','Test Account','Student','pending')
    ON CONFLICT(email) DO UPDATE SET username='test', full_name='Test Account', role='Student'`);
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==="OPTIONS") return json(res,204,{});
    const url=new URL(req.url,"http://localhost");
    if(req.method==="GET"&&url.pathname==="/health") return json(res,200,{ok:true});
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
      if(!user||!user.password_hash||!(await verifyPassword(password||"",user.password_hash))) return json(res,401,{error:"Invalid username or password"});
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
