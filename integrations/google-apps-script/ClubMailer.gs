// Replace Code.gs with this file. Keep the existing INVITATION_SECRET property.
// Update the EXISTING web-app deployment to a New version, preserving its URL.
function doGet() {
  const secret = PropertiesService.getScriptProperties().getProperty('INVITATION_SECRET');
  return reply_({ok:true,service:'Philosophy Club mail',actions:['invite','assignment'],configured:!!secret && secret.length >= 32});
}

function doPost(e) {
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('INVITATION_SECRET');
  let request;
  try {request=JSON.parse(e.postData.contents);} catch (_) {return reply_({ok:false,error:'Invalid request'});}
  if (!secret || secret.length < 32 || request.secret !== secret) return reply_({ok:false,error:'Unauthorized'});
  const {requestId,email}=request;
  if(typeof requestId!=='string'||! /^[a-zA-Z0-9-]{8,100}$/.test(requestId)||typeof email!=='string'||! /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))return reply_({ok:false,error:'Invalid request'});
  let subject,body;
  if(request.action==='invite'){
    if(typeof request.username!=='string'||! /^[a-zA-Z0-9._-]{1,80}$/.test(request.username)||typeof request.activationUrl!=='string'||! /^https:\/\/philosophy-ews\.onrender\.com\/activate\?token=[A-Za-z0-9_-]{43}$/.test(request.activationUrl))return reply_({ok:false,error:'Invalid invitation'});
    subject='Your Philosophy Club invitation';
    body='You are invited to the Philosophy Club dashboard!\n\nUsername: '+request.username+'\n\nCreate your password:\n'+request.activationUrl+'\n\nThis link expires in 24 hours.\n\nExplore assignments and resources, or message a club administrator through Inbox.';
  } else if(request.action==='assignment'){
    if(typeof request.title!=='string'||!request.title.trim()||request.title.length>180||typeof request.lessonTitle!=='string'||request.lessonTitle.length>180||!['resource','video','worksheet','discussion_questions'].includes(request.kind))return reply_({ok:false,error:'Invalid assignment'});
    subject='New Philosophy Club assignment: '+request.title.replace(/[\r\n]/g,' ');
    body='A new material has been assigned to the Philosophy Club.\n\n'+request.title+'\n'+(request.lessonTitle?'Lesson: '+request.lessonTitle+'\n':'')+'\nSign in to view the material and instructions:\nhttps://philosophy-ews.onrender.com/student\n\nQuestions? Use Inbox in the dashboard or reply to this email.';
  } else return reply_({ok:false,error:'Invalid request'});
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return reply_({ok:false,error:'Busy; check status before retrying'});
  // Keep the same key prefix so invitations sent through the previous script remain deduplicated.
  const key='invitation_'+requestId;
  try{
    const previous=properties.getProperty(key);
    if(previous)return reply_({ok:previous==='sent',status:previous});
    if(MailApp.getRemainingDailyQuota()<1)return reply_({ok:false,error:'Daily email limit reached'});
    properties.setProperty(key,'sending');
    MailApp.sendEmail({to:email,subject:subject,body:body,name:'Emery/Weiner Philosophy Club',replyTo:'grose@emeryweiner.org'});
    properties.setProperty(key,'sent');
    return reply_({ok:true,status:'sent'});
  }catch(_){return reply_({ok:false,error:'Delivery uncertain. Check Sent mail before retrying.'});}
  finally{lock.releaseLock();}
}

function reply_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
