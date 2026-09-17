import http from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {proxyBrowserRequest} from './browser-proxy.mjs';

// Only this gateway is public. Browser API requests retain the same route
// allowlist, origin checks and first-party cookie handling as before.
export function createGateway({apiOrigin,webOrigin}) {
  return http.createServer(async(req,res)=>{
    try {
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/api'||path.startsWith('/api/')) {
        const request=new Request('https://philosophy-ews.onrender.com'+req.url,{
          method:req.method,headers:req.headers,
          ...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{}),
        });
        const response=await proxyBrowserRequest(request,fetch,apiOrigin);
        res.writeHead(response.status,{...Object.fromEntries(response.headers),'x-club-service':'combined'});
        if(response.body)await pipeline(Readable.fromWeb(response.body),res);
        else res.end();
        return;
      }
      // Stream the website without buffering HTML, RSC payloads or assets.
      const upstream=http.request(webOrigin+req.url,{method:req.method,headers:req.headers},reply=>{
        res.writeHead(reply.statusCode,reply.headers);
        reply.pipe(res);
      });
      upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'text/plain'});res.end('The club server is starting. Please try again shortly.');});
      res.on('close',()=>upstream.destroy());
      req.pipe(upstream);
    } catch {
      if(!res.headersSent)res.writeHead(502,{'content-type':'application/json','cache-control':'no-store'});
      res.end(JSON.stringify({error:'The club server is temporarily unavailable.'}));
    }
  });
}
