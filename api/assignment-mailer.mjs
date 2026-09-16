export const MAILER_URL='https://script.google.com/macros/s/AKfycbwYq1mw8klvyK84u8Fc5X_DeORUz6X6_dHl_NgzlqTbSH161XTBIWZJPqMQYWRUG_47/exec';

export async function mailerReadiness(fetcher=fetch){
  if(!process.env.INVITATION_SECRET||process.env.INVITATION_SECRET.length<32)return {ready:false,reason:'Add INVITATION_SECRET to the API environment.'};
  try{
    const response=await fetcher(MAILER_URL,{signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(response.ok&&data.ok===true&&data.actions?.includes('assignment')&&data.configured===true)return {ready:true};
    return {ready:false,reason:'Update the Apps Script deployment to support assignment emails. Alerts remain queued until it is ready.'};
  }catch{return {ready:false,reason:'The email service is unavailable. Alerts remain queued.'};}
}

export async function drainAssignmentMail(pool,fetcher=fetch){
  if(!(await mailerReadiness(fetcher)).ready)return;
  // A crash after handing a message to Google is ambiguous: never blindly resend.
  await pool.query("UPDATE assignment_email_jobs SET status='uncertain',last_error='Delivery interrupted; check Sent mail' WHERE status='sending' AND updated_at<NOW()-INTERVAL '10 minutes'");
  for(let index=0;index<20;index++){
    const client=await pool.connect();let job;
    try{
      await client.query('BEGIN');
      job=(await client.query(`SELECT j.id,j.content_id,j.user_id,u.email,u.status AS account_status,c.status AS content_status,c.title,c.kind,c.content
        FROM assignment_email_jobs j JOIN users u ON u.id=j.user_id JOIN content_items c ON c.id=j.content_id
        WHERE j.status='pending' AND j.next_attempt_at<=NOW() ORDER BY j.id LIMIT 1 FOR UPDATE OF j SKIP LOCKED`)).rows[0];
      if(!job){await client.query('COMMIT');break;}
      const status=job.account_status==='active'&&job.content_status==='published'?'sending':'cancelled';
      await client.query('UPDATE assignment_email_jobs SET status=$1,updated_at=NOW() WHERE id=$2',[status,job.id]);
      await client.query('COMMIT');
      if(status==='cancelled')continue;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    let status='uncertain',error='Delivery could not be confirmed; check Sent mail before retrying';
    try{
      const response=await fetcher(MAILER_URL,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({action:'assignment',secret:process.env.INVITATION_SECRET,requestId:`assignment-${job.content_id}-${job.user_id}`,email:job.email,title:job.title,lessonTitle:job.content.lessonTitle||'',kind:job.kind})});
      const result=await response.json();
      if(response.ok&&result.ok===true&&result.status==='sent'){status='sent';error='';}
      else if(result.error==='Daily email limit reached'){status='pending';error='Daily email quota reached; retry scheduled';}
      else if(['Unauthorized','Invalid request','Invalid assignment','Wrong sender account'].includes(result.error)){status='failed';error=result.error;}
    }catch{/* Do not retry a message Google might already have sent. */}
    await pool.query("UPDATE assignment_email_jobs SET status=$1,last_error=$2,updated_at=NOW(),next_attempt_at=CASE WHEN $1='pending' THEN NOW()+INTERVAL '1 hour' ELSE next_attempt_at END WHERE id=$3",[status,error,job.id]);
    if(status==='pending'||status==='failed')break;
  }
}

export function startAssignmentMailer(pool){
  let running=false;
  const tick=async()=>{if(running)return;running=true;try{await drainAssignmentMail(pool);}catch{console.error('Assignment email worker failed; queued messages retained');}finally{running=false;}};
  const timer=setInterval(()=>void tick(),60000);timer.unref();void tick();return timer;
}
