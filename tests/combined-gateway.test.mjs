import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createGateway} from '../api/combined-gateway.mjs';

test('one public port routes website and API locally while preserving browser protections',async t=>{
  const calls=[];
  const api=http.createServer(async(req,res)=>{
    calls.push(req.url);
    let body='';for await(const chunk of req)body+=chunk;
    res.writeHead(200,{'content-type':'application/json','set-cookie':'philosophy_session=test; HttpOnly; Secure; SameSite=None; Path=/'});
    res.end(JSON.stringify({path:req.url,body,cookie:req.headers.cookie}));
  });
  const web=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('Website '+req.url);});
  for(const s of [api,web]){s.listen(0,'127.0.0.1');await once(s,'listening');}
  const gateway=createGateway({apiOrigin:`http://127.0.0.1:${api.address().port}`,webOrigin:`http://127.0.0.1:${web.address().port}`});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  t.after(()=>{for(const s of [gateway,api,web]){s.closeAllConnections();s.close();}});
  const base=`http://127.0.0.1:${gateway.address().port}`;
  assert.equal(await(await fetch(base+'/student?tab=assignments')).text(),'Website /student?tab=assignments');
  const me=await fetch(base+'/api/auth/me',{headers:{cookie:'philosophy_session=test'}});
  assert.equal((await me.json()).cookie,'philosophy_session=test');
  assert.match(me.headers.get('set-cookie'),/SameSite=Lax/);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'https://philosophy-ews.onrender.com','content-type':'application/json'},body:'{"username":"test"}'});
  assert.equal((await login.json()).body,'{"username":"test"}');
  assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+'/api/admin/users/import',{method:'POST'})).status,404);
  assert.deepEqual(calls,['/auth/me','/auth/login']);
});
