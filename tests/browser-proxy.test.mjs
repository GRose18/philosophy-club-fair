import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proxyBrowserRequest} from '../api/browser-proxy.mjs';
const origin='https://philosophy-ews.onrender.com';
const req=(path,options={})=>new Request(origin+'/api'+path,options);

test('login sets a first-party HttpOnly cookie and forwards session on subsequent requests',async()=>{
  const login=await proxyBrowserRequest(req('/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'test',password:'not-a-real-password'})}),async(url,options)=>{
    assert.equal(url,'https://philosophy-ews-api.onrender.com/auth/login');
    assert.equal(options.headers.get('origin'),origin);
    assert.equal(JSON.parse(await new Response(options.body).text()).username,'test');
    return Response.json({ok:true,user:{role:'Student'}},{headers:{'set-cookie':'philosophy_session=test-session; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800'}});
  });
  assert.equal(login.status,200);
  assert.equal(login.headers.get('set-cookie'),'philosophy_session=test-session; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800');
  assert.match(login.headers.get('cache-control'),/no-store/);
  const me=await proxyBrowserRequest(req('/auth/me',{headers:{cookie:'unrelated=secret; philosophy_session=test-session','x-automation-key':'do-not-forward'}}),async(_,options)=>{
    assert.equal(options.headers.get('cookie'),'philosophy_session=test-session');
    assert.equal(options.headers.get('x-automation-key'),null);
    return Response.json({user:{role:'Student'}});
  });
  assert.equal((await me.json()).user.role,'Student');
});

test('rejects cross-site writes and non-browser endpoints without contacting upstream',async()=>{
  const unexpected=()=>{throw new Error('must not fetch');};
  for(const path of ['/auth/login','auth/logout','/admin/invitations/send']){
    assert.ok([403,404].includes((await proxyBrowserRequest(req(path,{method:'POST',headers:{origin:'https://other.example'}}),unexpected)).status));
  }
  assert.equal((await proxyBrowserRequest(req('/admin/users/import',{method:'POST',headers:{origin}}),unexpected)).status,404);
  assert.equal((await proxyBrowserRequest(req('/auth/logout',{method:'POST'}),unexpected)).status,403);
});

test('protected files retain byte ranges and logout clears first-party cookie',async()=>{
  const file=await proxyBrowserRequest(req('/content-files/2',{headers:{range:'bytes=0-2',cookie:'philosophy_session=example'}}),async(_,options)=>{
    assert.equal(options.headers.get('range'),'bytes=0-2');
    return new Response('PDF',{status:206,headers:{'content-type':'application/pdf','content-range':'bytes 0-2/100','accept-ranges':'bytes'}});
  });
  assert.equal(file.status,206);assert.equal(await file.text(),'PDF');assert.equal(file.headers.get('content-range'),'bytes 0-2/100');
  const logout=await proxyBrowserRequest(req('/auth/logout',{method:'POST',headers:{origin}}),async()=>Response.json({ok:true},{headers:{'set-cookie':'philosophy_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'}}));
  assert.match(logout.headers.get('set-cookie'),/SameSite=Lax/);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});

test('does not follow redirects or retry uncertain writes',async()=>{
  let calls=0;
  const failed=await proxyBrowserRequest(req('/auth/activate',{method:'POST',headers:{origin},body:'{}'}),async()=>{calls++;throw new Error('timeout');});
  assert.equal(failed.status,502);assert.equal(calls,1);
  const redirected=await proxyBrowserRequest(req('/auth/me'),async(_,options)=>{assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://other.example'}});});
  assert.equal(redirected.status,502);
});
