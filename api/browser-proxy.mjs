// Browser traffic stays on the dashboard origin so sessions are first-party.
const upstreamOrigin = 'https://philosophy-ews-api.onrender.com';
const appOrigin = 'https://philosophy-ews.onrender.com';
const routes = {
  GET: /^\/(?:auth\/me|content|content-files\/\d+|inbox|admin\/(?:users|notification-status)|health)$/,
  POST: /^\/(?:auth\/(?:login|logout|activate)|inbox|admin\/(?:uploads|content|content\/\d+\/unpublish|invitations\/send))$/,
};
const fail = (status, error) => Response.json({error}, {status, headers:{'cache-control':'no-store'}});

export async function proxyBrowserRequest(request, fetcher = fetch) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api(?=\/)/, '');
  if (!routes[request.method]?.test(path)) return fail(404, 'Not found');
  // Never turn a cross-site request into a trusted upstream request.
  if (request.method === 'POST' && request.headers.get('origin') !== appOrigin)
    return fail(403, 'Use the club dashboard to submit this request');
  const headers = new Headers();
  for (const name of ['content-type','range','x-file-name','x-material-kind']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const session = (request.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('philosophy_session='));
  if (session) headers.set('cookie', session);
  if (request.method === 'POST') headers.set('origin', appOrigin);
  try {
    const upstream = await fetcher(upstreamOrigin + path + url.search, {
      method: request.method, headers, redirect:'manual',
      ...(request.method === 'POST' ? {body:request.body, duplex:'half'} : {}),
      signal: AbortSignal.timeout(75000),
    });
    if (upstream.status >= 300 && upstream.status < 400) return fail(502, 'Unexpected server redirect');
    // Hosting gateway errors are HTML, even when the requested endpoint is JSON.
    // Successful protected file downloads must retain their original byte stream.
    const isFile = /^\/content-files\/\d+$/.test(path) && upstream.ok;
    if (!isFile && !upstream.headers.get('content-type')?.includes('application/json')) {
      await upstream.body?.cancel();
      return fail(502, request.method === 'POST'
        ? 'The server could not confirm this action. Check whether it completed before trying again. For invitations, check the sender’s Sent mail.'
        : 'The club server is temporarily unavailable. Wait a moment, then refresh or try again.');
    }
    const responseHeaders = new Headers({'cache-control':'private, no-store','vary':'Cookie'});
    for (const name of ['content-type','content-disposition','content-range','accept-ranges']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const cookie = upstream.headers.get('set-cookie');
    if (cookie?.startsWith('philosophy_session=')) {
      responseHeaders.set('set-cookie', cookie.replace(/;\s*Domain=[^;]*/gi,'').replace(/SameSite=None/gi,'SameSite=Lax'));
    }
    return new Response(upstream.body, {status:upstream.status, headers:responseHeaders});
  } catch {
    return fail(502, 'The server could not confirm this request. Please check your account before retrying.');
  }
}
