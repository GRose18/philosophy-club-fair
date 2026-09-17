import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createGateway} from './combined-gateway.mjs';

// One Render instance, one public port, no network hop to another service.
for(const key of ['DATABASE_URL','SESSION_SECRET']) {
  if(!process.env[key])throw new Error(`Combined service requires ${key}`);
}
const publicPort=Number(process.env.PORT||10000);
const apiPort=19001,webPort=19002;
if([apiPort,webPort].includes(publicPort))throw new Error('Public port conflicts with an internal port');
const apiOrigin=`http://127.0.0.1:${apiPort}`;
const webOrigin=`http://127.0.0.1:${webPort}`;
const children=[];
let stopping=false;
const gateway=createGateway({apiOrigin,webOrigin});
function stop(code){
  if(stopping)return;
  stopping=true;
  gateway.close();
  for(const child of children)child.kill('SIGTERM');
  setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},3000);
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>stop(0));
function launch(command,args,env){
  const child=spawn(command,args,{env,stdio:'inherit'});
  children.push(child);
  child.on('error',()=>{console.error('A combined-service process failed to start');stop(1);});
  child.on('exit',()=>{if(!stopping){console.error('A combined-service process exited');stop(1);}});
}
launch(process.execPath,['api/server.mjs'],{...process.env,PORT:String(apiPort),API_HOST:'127.0.0.1'});
launch('./node_modules/.bin/wrangler',['dev','--config','dist/server/wrangler.json','--ip','127.0.0.1','--port',String(webPort)],process.env);
async function ready(url){
  const deadline=Date.now()+120000;
  while(!stopping&&Date.now()<deadline){
    try{const response=await fetch(url,{signal:AbortSignal.timeout(3000)});await response.body?.cancel();if(response.ok)return;}catch{}
    await delay(500);
  }
  throw new Error('Combined service did not become ready');
}
try{
  await Promise.all([ready(apiOrigin+'/health'),ready(webOrigin+'/login')]);
  if(!stopping)gateway.listen(publicPort,'0.0.0.0',()=>console.log('Website and API ready on the same service'));
}catch(error){console.error(error.message);stop(1);}
