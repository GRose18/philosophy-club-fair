// HTTP authorization tests with an isolated database double; Node 24+.
import { registerHooks } from 'node:module';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'isolated-test-secret';
const users = [
  { id: '1', role: 'Student', full_name: 'Student One' },
  { id: '2', role: 'Student', full_name: 'Student Two' },
  { id: '3', role: 'Owner', full_name: 'Owner' },
];
const messages = [];
const materials=[{id:1,kind:'resource',title:'Test reading',content:{lessonTitle:'Fairness'},status:'published'}];
const deliveries = new Map();
const realFetch = globalThis.fetch;
let relayCalls = 0, relayTimeout = false;
globalThis.fetch = async (url, options) => {
  if(String(url).startsWith('https://script.google.com/')){
    relayCalls++;
    assert.equal(JSON.parse(options.body).secret,process.env.INVITATION_SECRET);
    if(relayTimeout)throw new Error('Simulated network timeout');
    return new Response(JSON.stringify({ok:true,status:'sent'}),{status:200});
  }
  return realFetch(url,options);
};
globalThis.__testQuery = async (sql, args = []) => {
  if(sql.startsWith("UPDATE content_items SET status='draft'")){const item=materials.find(item=>item.id===args[0]&&item.status==='published');if(item)item.status='draft';return {rows:item?[item]:[]};}
  if(sql.startsWith('SELECT id,kind,title,content,created_at FROM content_items'))return {rows:materials.filter(item=>item.status==='published')};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]};
  if(sql.includes('FROM users WHERE lower(email)'))return {rows:users.filter(u=>`${u.id}@example.com`===args[0]).map(u=>({...u,email:args[0],username:`user${u.id}`}))};
  if(sql.startsWith('SELECT user_id,status FROM invitation_deliveries'))return {rows:deliveries.has(args[0])?[deliveries.get(args[0])]:[]};
  if(sql.startsWith('SELECT status FROM invitation_deliveries'))return {rows:[...deliveries.values()].filter(d=>d.user_id===args[0])};
  if(sql.startsWith('INSERT INTO invitations('))return {rows:[]};
  if(sql.startsWith('INSERT INTO invitation_deliveries')){deliveries.set(args[0],{user_id:args[1],status:'pending'});return {rows:[]};}
  if(sql.startsWith('UPDATE invitation_deliveries')){deliveries.get(args[1]).status=args[0];return {rows:[]};}
  if (sql.includes("status='active'"))
    return { rows: users.filter((u) => u.id === String(args[0])) };
  if (sql.includes("role='Student'"))
    return {
      rows: users.filter(
        (u) => u.id === String(args[0]) && u.role === 'Student',
      ),
    };
  if (sql.startsWith('INSERT INTO inbox_messages')) {
    const m = {
      id: String(messages.length + 1),
      student_id: String(args[0]),
      sender_id: String(args[1]),
      body: args[2],
    };
    messages.push(m);
    return { rows: [m] };
  }
  if (sql.includes('FROM inbox_messages') && sql.includes('WHERE m.student_id'))
    return {
      rows: messages
        .filter((m) => m.student_id === String(args[0]))
        .map((m) => ({ ...m, mine: m.sender_id === String(args[1]) })),
    };
  if (sql.includes('DISTINCT ON'))
    return {
      rows: messages.map((m) => ({
        id: m.student_id,
        preview: m.body,
        updatedAt: new Date().toISOString(),
      })),
    };
  throw new Error(`Unexpected test query: ${sql}`);
};
const hook = registerHooks({
  resolve(specifier, context, next) {
    return specifier === 'pg'
      ? { url: 'mock:pg', shortCircuit: true }
      : next(specifier, context);
  },
  load(url, context, next) {
    return url === 'mock:pg'
      ? {
          format: 'module',
          source:
            'export default {Pool:class {query(...args){return globalThis.__testQuery(...args)} async connect(){return {query:globalThis.__testQuery,release(){}}}}}',
          shortCircuit: true,
        }
      : next(url, context);
  },
});
const { server } = await import('../api/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  hook.deregister();
  globalThis.fetch=realFetch;
});
function cookie(id) {
  const payload = Buffer.from(
    JSON.stringify({ id, exp: Date.now() + 60000 }),
  ).toString('base64url');
  return `philosophy_session=${payload}.${crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url')}`;
}
const request = (id, path, body, origin) =>
  fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(id ? { cookie: cookie(id) } : {}),
      'content-type': 'application/json',
      ...(origin ? { origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
test('inbox privacy and administrator replies', async () => {
  assert.equal((await request(null, '/inbox')).status, 401);
  assert.equal(
    (await request('1', '/inbox?student=2', { body: 'My question' })).status,
    201,
  );
  assert.equal(
    messages[0].student_id,
    '1',
    'student cannot choose another recipient thread',
  );
  assert.equal(
    (await (await request('2', '/inbox?student=1')).json()).messages.length,
    0,
    'other student cannot read thread',
  );
  assert.equal(
    (await (await request('3', '/inbox?student=1')).json()).messages.length,
    1,
  );
  assert.equal(
    (await request('3', '/inbox?student=1', { body: 'An administrator reply' }))
      .status,
    201,
  );
  assert.equal(
    (await (await request('1', '/inbox')).json()).messages.length,
    2,
  );
  assert.equal(
    (await request('3', '/inbox?student=3', { body: 'Invalid thread' })).status,
    404,
  );
  assert.equal((await request('1', '/inbox', { body: '  ' })).status, 400);
  assert.equal(
    (await request('1', '/inbox', { body: 'x'.repeat(4001) })).status,
    400,
  );
  assert.equal(
    (
      await request(
        '1',
        '/inbox',
        { body: 'Cross origin' },
        'https://untrusted.example',
      )
    ).status,
    403,
  );
  assert.equal(
    (await request('1', '/admin/content', { title: 'Not authorized' })).status,
    403,
  );
  assert.equal(messages.length, 2);
});
test('invitations require owner confirmation and do not retry delivery',async()=>{
  const path='/admin/invitations/send',origin='https://philosophy-ews.onrender.com';
  const body={email:'1@example.com',confirmed:true,requestId:crypto.randomUUID()};
  assert.equal((await request('1',path,body,origin)).status,403);
  assert.equal((await request('3',path,body)).status,403);
  assert.equal((await request('3',path,{...body,confirmed:false},origin)).status,400);
  delete process.env.INVITATION_SECRET;
  assert.equal((await request('3',path,body,origin)).status,503);
  assert.equal(relayCalls,0);
  process.env.INVITATION_SECRET='isolated-private-test-secret-at-least-32';
  const response=await request('3',path,body,origin);
  assert.equal(response.status,200);
  assert.equal((await response.json()).status,'sent');
  assert.equal(relayCalls,1);
  assert.equal((await request('3',path,body,origin)).status,200);
  assert.equal(relayCalls,1,'same request cannot send twice');
  assert.equal((await request('3',path,{...body,requestId:crypto.randomUUID()},origin)).status,429);
  relayTimeout=true;
  const second={...body,email:'2@example.com',requestId:crypto.randomUUID()};
  const uncertain=await request('3',path,second,origin);
  assert.equal(uncertain.status,502);
  assert.equal((await uncertain.json()).status,'uncertain');
  assert.equal((await request('3',path,second,origin)).status,409);
  assert.equal(relayCalls,2,'uncertain sends never retry automatically');
});
test('club-wide removal requires admin confirmation and preserves stored content',async()=>{
  const path='/admin/content/1/unpublish',origin='https://philosophy-ews.onrender.com';
  assert.equal((await (await request('1','/content')).json()).items.length,1);
  assert.equal((await request('1',path,{confirmed:true},origin)).status,403);
  assert.equal((await request('3',path,{confirmed:true})).status,403);
  assert.equal((await request('3',path,{confirmed:false},origin)).status,400);
  assert.equal((await request('3',path,{confirmed:true},origin)).status,200);
  assert.equal((await (await request('1','/content')).json()).items.length,0);
  assert.equal(materials[0].status,'draft');
  assert.equal(materials[0].title,'Test reading');
  assert.equal((await request('3',path,{confirmed:true},origin)).status,404);
});
