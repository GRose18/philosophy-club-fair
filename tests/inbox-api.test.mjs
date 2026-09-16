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
globalThis.__testQuery = async (sql, args = []) => {
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
            'export default {Pool:class {query(...args){return globalThis.__testQuery(...args)}}}',
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
