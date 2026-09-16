import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drainAssignmentMail} from '../api/assignment-mailer.mjs';
process.env.INVITATION_SECRET='test-only-secret-at-least-thirty-two-characters';
function database(jobs){
 const query=async(sql,args=[])=>{
  if(sql.includes('SELECT j.id'))return {rows:jobs.filter(j=>j.status==='pending').slice(0,1)};
  if(sql.startsWith('UPDATE assignment_email_jobs SET status=$1')){
   const id=args.length===3?args[2]:args[1];const job=jobs.find(j=>j.id===id);job.status=args[0];job.last_error=args.length===3?args[1]:'';
  }
  return {rows:[]};
 };
 return {query,connect:async()=>({query,release(){}})};
}
const job=(id,account_status='active',content_status='published')=>({id,content_id:10,user_id:id,email:`${id}@example.com`,account_status,content_status,title:'Fairness',kind:'resource',content:{lessonTitle:'Justice'},status:'pending'});
test('old script queues without sending; active and published checks; no duplicate retry',async()=>{
 const jobs=[job(1),job(2,'pending'),job(3,'active','draft')];let sends=0,ready=false;
 const fetcher=async(_url,options)=>{
  if(options.method==='POST'){sends++;return new Response(JSON.stringify({ok:true,status:'sent'}));}
  return new Response(JSON.stringify({ok:true,configured:true,actions:ready?['invite','assignment']:['invite']}));
 };
 const pool=database(jobs);
 await drainAssignmentMail(pool,fetcher);assert.equal(sends,0);assert.equal(jobs[0].status,'pending');
 ready=true;await drainAssignmentMail(pool,fetcher);
 assert.equal(sends,1);assert.deepEqual(jobs.map(j=>j.status),['sent','cancelled','cancelled']);
 await drainAssignmentMail(pool,fetcher);assert.equal(sends,1);
});
test('uncertain delivery is not automatically resent',async()=>{
 const jobs=[job(1)];let sends=0;
 const fetcher=async(_url,options)=>{if(options.method==='POST'){sends++;throw new Error('timeout');}return new Response(JSON.stringify({ok:true,configured:true,actions:['assignment']}));};
 const pool=database(jobs);await drainAssignmentMail(pool,fetcher);await drainAssignmentMail(pool,fetcher);
 assert.equal(jobs[0].status,'uncertain');assert.equal(sends,1);
});
test('quota exhaustion leaves delivery pending',async()=>{
 const jobs=[job(1)];const fetcher=async(_url,options)=>new Response(JSON.stringify(options.method==='POST'?{ok:false,error:'Daily email limit reached'}:{ok:true,configured:true,actions:['assignment']}));
 await drainAssignmentMail(database(jobs),fetcher);assert.equal(jobs[0].status,'pending');
});
