
// ================= Clips: OpusClip → ranked clips → posting plan → scheduled to your accounts =================
let opSel=null,opSig='',opOpen=null;
const PLAT={YOUTUBE:['youtube','YouTube'],TIKTOK_BUSINESS:['tiktok','TikTok'],FACEBOOK_PAGE:['facebook','Facebook'],INSTAGRAM_BUSINESS:['instagram','Instagram'],LINKEDIN:['facebook','LinkedIn'],TWITTER:['facebook','X']};
const platName=p=>(PLAT[p]||[0,p])[1];
const DEF_CLIP_TIMES=['12:00','17:30','20:30'];
const clipTimes=()=>Array.isArray(settings.clipTimes)&&settings.clipTimes.length?settings.clipTimes:DEF_CLIP_TIMES;
const clipAt=c=>c&&c.plan&&c.plan.at?new Date(c.plan.at):null;
function clipsUpcoming(){const now=Date.now(),end=now+7*864e5;return Object.entries(clipsData).map(([id,c])=>({id,c,t:clipAt(c)})).filter(x=>x.t&&['planned','scheduled'].includes(x.c.status)&&x.t.getTime()>now-3600e3&&x.t.getTime()<end).sort((a,b)=>a.t-b.t)}
function clipsOnCal(){return Object.entries(clipsData).map(([id,c])=>({id,c,t:clipAt(c)})).filter(x=>x.t&&['planned','scheduled','sent'].includes(x.c.status))}
const scoreCls=n=>n>=75?'hi':n>=55?'mid':'lo';
const fmtSecs=s=>{s=Math.round(s||0);return s>=60?Math.floor(s/60)+':'+pad2(s%60):s+'s'};
// a clip dressed up as a post, so it gets the same platform captions and hashtag rules as everything else
function clipPost(c){return {title:c.hook||c.title||'',caption:c.caption||[c.title,c.desc].filter(Boolean).join('\n\n'),template:'poll',fields:{speaker:(c.people||[])[0]||'',question:''},photoSearch:{term:(c.people||[]).join(' ')}}}
function clipPack(c){const d=packDefaults(clipPost(c));const s=c.pack||{};return {facebook:s.facebook||d.facebook,instagram:s.instagram||d.instagram,tiktok:s.tiktok||d.tiktok,youtube:{...d.youtube,...(s.youtube||{})}}}
function clipState(c){const t=clipAt(c);
  if(c.status==='sent')return {t:'Posted'+(c.sched&&c.sched.length?' by OpusClip':''),cls:'ok'};
  if(c.status==='posted')return {t:'Posted',cls:'ok'};
  if(c.status==='scheduled'&&t)return {t:'Scheduled · '+dlabel(t)+' '+hm(t),cls:'ok'};
  if(c.status==='planned'&&t)return {t:'Planned · '+dlabel(t)+' '+hm(t),cls:'plan'};
  if(c.status==='missed')return {t:'Missed its slot',cls:''};
  if(c.skip)return {t:'Skipped',cls:''};
  if(c.post===false)return {t:'Claude says skip',cls:''};
  return {t:'In reserve',cls:''}}
const opAccounts=()=>(metaDocs.opusAccounts&&metaDocs.opusAccounts.accounts)||[];
const acctKey=a=>a.postAccountId+'|'+(a.subAccountId||'');
function chosenAccounts(){const all=opAccounts();const pick=Array.isArray(settings.opusTargets)?settings.opusTargets:null;return pick?all.filter(a=>pick.includes(acctKey(a))):all}
function targetsFor(c,accts){const pk=clipPack(c);return accts.map(a=>{const plat=(PLAT[a.platform]||['facebook'])[0];
  return {postAccountId:a.postAccountId,subAccountId:a.subAccountId||null,platform:a.platform,name:a.name,title:plat==='youtube'?pk.youtube.title:(c.hook||c.title||''),description:plat==='youtube'?pk.youtube.description:pk[plat]}})}
function opReady(el){if(!(window.PB&&PB.opus)){el.textContent='Clips work in the installed Studio.';return false}
  if(metaDocs.system&&metaDocs.system.opus===false){el.textContent='OpusClip isn’t connected yet (setup guide, step 9).';return false}return true}

// ---------- page ----------
function renderClips(soft){if(!$('#op-plan'))return;
  const pl=$('#op-plan');pl.innerHTML='';const up=clipsUpcoming();let last='';const today=ymd(new Date());
  up.forEach(x=>{const k=ymd(x.t);if(k!==last){const h=document.createElement('div');h.className='pday';h.textContent=k===today?'Today':dlabel(x.t);pl.appendChild(h);last=k}
    pl.appendChild(hItem(hm(x.t),x.c.hook||x.c.title||'Clip',(x.c.score!=null?'Score '+x.c.score+' · ':'')+fmtSecs(x.c.secs)+' · '+(x.c.status==='scheduled'?'scheduled on OpusClip':'not scheduled yet'),x.c.status==='scheduled'?{t:'✓ Auto'}:{t:'To do',cls:'live'},()=>openClip(x.id)))});
  if(!up.length)pl.innerHTML='<p class="hempty">'+(Object.keys(clipsData).length?'Nothing planned. Tap Re-plan to fill the next week from your best clips.':'Make clips from a video and the best ones are planned here automatically.')+'</p>';
  const cp=metaDocs.clipplan;if(cp&&cp.reserve&&up.length)pl.insertAdjacentHTML('beforeend','<p class="hempty">'+cp.reserve+' more good clip'+(cp.reserve===1?'':'s')+' in reserve for later days.</p>');
  const pj=$('#op-projects');pj.innerHTML='';const ps=Object.entries(opusProjects).sort((a,b)=>String(b[1].at).localeCompare(String(a[1].at)));
  if(!opSel||!opusProjects[opSel]){const withClips=ps.find(([id])=>Object.values(clipsData).some(c=>c.project===id));opSel=withClips?withClips[0]:ps.length?ps[0][0]:null}
  ps.forEach(([id,p])=>{const n=Object.values(clipsData).filter(c=>c.project===id).length;
    const st={processing:{t:'Making…',cls:'live'},ranking:{t:'Ranking…',cls:'live'},ready:{t:n+' clips'},failed:{t:'Failed'}}[p.status]||{t:String(p.status||'')};
    const sub=p.status==='processing'?'Started '+ago(p.at)+'. Usually 10–30 minutes.':p.status==='failed'?(p.error||'Something went wrong.'):p.status==='ranking'?'Claude is ranking the clips…':(p.ranked==='claude'?'Ranked by Claude':'In OpusClip’s order')+(p.lastError?' · '+p.lastError:'');
    const b=hItem(new Date(p.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}),p.title||'Video',sub,st,()=>{opSel=id;opSig='';renderClips();setTimeout(()=>{const x=$('#op-clipsbox');if(x)x.scrollIntoView({behavior:'smooth',block:'start'})},60)});
    if(id===opSel)b.style.boxShadow='inset 0 0 0 2px var(--navy)';pj.appendChild(b)});
  if(!ps.length)pj.innerHTML='<p class="hempty">No videos yet. Paste a YouTube link above.</p>';
  const box=$('#op-clipsbox');const p=opusProjects[opSel];box.hidden=!p;if(!p)return;
  $('#op-ctitle').textContent=p.title||'Clips';
  const list=Object.entries(clipsData).filter(([,c])=>c.project===opSel).sort((a,b)=>((b[1].score??-1)-(a[1].score??-1))||((a[1].n||0)-(b[1].n||0)));
  const sig=opSel+'|'+p.status+'|'+list.map(([id,c])=>[id,c.status,c.score,c.plan&&c.plan.at,c.skip,c.post,c.hook].join(':')).join(',');
  if(soft&&sig===opSig)return;opSig=sig;
  $('#op-cmsg').textContent=p.status==='processing'?'OpusClip is still making these. They appear here by themselves.':p.status==='ranking'?'Claude is ranking them…':list.length?'Best first. The score is Claude’s prediction of views on Pundit Bible (out of 100), not a promise.':'';
  const g=$('#op-clips');g.innerHTML='';list.forEach(([id,c],i)=>g.appendChild(clipCard(id,c,i+1)));
  if(!soft)renderOpCfg()}
function clipCard(id,c,rank){const d=document.createElement('article');const off=c.skip||c.post===false;d.className='clipc'+(off?' off':'');
  d.innerHTML=`<div class="vw"><video playsinline muted preload="metadata" controls></video><span class="rk">#${rank}</span>${c.score!=null?`<span class="sc ${scoreCls(c.score)}">${c.score}</span>`:''}</div>
    <div class="ci"><b></b><p class="why"></p><span class="cstate"></span><div class="row"><button class="sm" type="button" data-a="open">Open</button><button class="ghost sm" type="button" data-a="skip"></button></div></div>`;
  const v=d.querySelector('video');if(c.preview)v.src=c.preview+(c.preview.includes('#')?'':'#t=0.5');
  d.querySelector('b').textContent=c.hook||c.title||'Clip';d.querySelector('.why').textContent=fmtSecs(c.secs)+(c.reason?' · '+c.reason:'');
  const st=clipState(c);const se=d.querySelector('.cstate');se.textContent=st.t;if(st.cls)se.classList.add(st.cls);
  const sk=d.querySelector('[data-a=skip]');sk.textContent=off?'Use it':'Skip';sk.hidden=['scheduled','sent','posted'].includes(c.status);
  sk.onclick=()=>setSkip(id,!off);d.querySelector('[data-a=open]').onclick=()=>openClip(id);return d}
async function setSkip(id,skip){const c=clipsData[id];if(!c||!db)return;const patch=skip?{skip:true,status:'new',plan:null}:{skip:false,post:true,status:c.status==='missed'?'new':c.status};
  Object.assign(c,patch);opSig='';renderClips();await db.doc('clips/'+id).update(patch);try{await PB.opus.plan()}catch(e){}}
async function moveClip(id,day,time,msgEl){const c=clipsData[id];if(!c||!db)return;const m=msgEl||$('#cal-msg');
  if(c.status==='scheduled'||c.status==='sent'){if(m)m.textContent='That clip is already with OpusClip. Open it and cancel the schedule first.';return}
  const [h,mi]=time.split(':').map(Number);const d=new Date(day);d.setHours(h,mi,0,0);
  const plan={at:d.toISOString(),locked:true,reminded:false};Object.assign(c,{plan,status:'planned',skip:false});
  await db.doc('clips/'+id).update({plan,status:'planned',skip:false});if(m)m.textContent='Moved “'+(c.hook||c.title||'clip')+'” to '+dlabel(d)+' · '+time+'.';studioRefresh()}
function clipSlotPicker(id,onDone){const m=document.createElement('div');m.className='modal';m.style.zIndex=12;const box=document.createElement('div');box.style.cssText='background:#fff;padding:16px;border-radius:10px;max-width:560px;width:100%;display:grid;gap:10px';
  box.innerHTML='<h3 style="color:var(--navy);margin:0">Post it when?</h3><div class="slotpick"></div><div class="row"><input type="datetime-local" style="flex:1"><button type="button" class="sm">Use this time</button></div><button type="button" class="ghost">Cancel</button>';
  const g=box.querySelector('.slotpick');const start=new Date();start.setHours(0,0,0,0);const times=[...new Set([...clipTimes(),...slotsList()])].sort();
  for(let i=0;i<14;i++){const d=new Date(start);d.setDate(d.getDate()+i);times.forEach(t=>{const [h,mi]=t.split(':').map(Number);const at=new Date(d);at.setHours(h,mi,0,0);if(at.getTime()<Date.now()+10*60000)return;
    const b=document.createElement('button');b.type='button';b.className='ghost sm';b.textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric'})+' '+t;b.onclick=async()=>{m.remove();await moveClip(id,d,t,onDone&&onDone.msg);onDone&&onDone()};g.appendChild(b)})}
  const inp=box.querySelector('input');box.querySelector('.row button').onclick=async()=>{if(!inp.value)return;const d=new Date(inp.value);if(isNaN(d))return;m.remove();await moveClip(id,d,hm(d),onDone&&onDone.msg);onDone&&onDone()};
  box.querySelector('button.ghost:last-child').onclick=()=>m.remove();m.appendChild(box);m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m)}

// ---------- one clip ----------
function local(id,patch){if(clipsData[id])Object.assign(clipsData[id],patch)}
function openClip(id){const c=clipsData[id];if(!c){showTab('clips');return}if(curTab!=='clips'&&curTab!=='calendar'&&curTab!=='home')showTab('clips',true);opOpen=id;
  const old=document.getElementById('clipmodal');if(old)old.remove();
  const m=document.createElement('div');m.className='modal';m.id='clipmodal';const b=document.createElement('div');b.className='cmodal';
  const edits=JSON.parse(JSON.stringify(c.pack||{}));let hook=c.hook||c.title||'';const cur=()=>({...c,hook,pack:edits});
  b.innerHTML=`<div><video controls playsinline preload="metadata"></video><div class="row" style="margin-top:8px"><button class="ghost sm" data-a="save" type="button">Save video to phone</button><button class="ghost sm" data-a="close" type="button">Close</button></div><p class="msg" data-m="v"></p></div>
    <div style="display:grid;gap:10px;align-content:start">
      <div class="ph"><h3></h3>${c.score!=null?`<span class="sc ${scoreCls(c.score)}" style="font:700 14px/1 Barlow,sans-serif;padding:6px 9px;border-radius:4px">Score ${c.score}</span>`:''}</div>
      <p class="why" style="margin:0" data-f="why"></p>
      <label class="opf">Title<input type="text" data-f="hook"></label>
      <div class="pills" data-tabs></div>
      <textarea data-f="cap" aria-label="Caption"></textarea>
      <div class="row"><button class="ghost sm" data-a="copy" type="button">Copy caption</button><span class="msg" data-m="c"></span></div>
      <div class="row"><b>When:</b> <span class="cstate" data-f="state"></span><button class="ghost sm" data-a="when" type="button">Change time</button></div>
      <div><b>Post to</b><div data-accts></div></div>
      <div class="row"><button data-a="sched" type="button">Schedule on OpusClip</button><button class="ghost" data-a="now" type="button">Post now</button><button class="ghost" data-a="cancel" type="button" hidden>Cancel schedule</button></div>
      <div class="row"><button class="ghost sm" data-a="done" type="button">I posted it myself</button><button class="ghost sm" data-a="skip" type="button"></button></div>
      <p class="msg" data-m="s"></p>
      <details><summary>What’s said in the clip</summary><p class="msg" data-f="tx" style="white-space:pre-wrap;margin-top:8px"></p></details>
    </div>`;
  const q=s=>b.querySelector(s);const v=q('video');if(c.preview)v.src=c.preview;
  q('h3').textContent='Clip from '+((opusProjects[c.project]||{}).title||'your video');q('[data-f=why]').textContent=fmtSecs(c.secs)+(c.reason?' · '+c.reason:'');q('[data-f=tx]').textContent=c.text||'(No transcript came back from OpusClip.)';
  const hk=q('[data-f=hook]');hk.value=hook;
  const TABS2=[['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['ytTitle','YouTube title'],['ytDesc','YouTube description']];let tab='facebook';const ta=q('[data-f=cap]');
  const valOf=k=>{const pk=clipPack(cur());return k==='ytTitle'?pk.youtube.title:k==='ytDesc'?pk.youtube.description:pk[k]};
  const setVal=(k,v)=>{if(k==='ytTitle'||k==='ytDesc'){edits.youtube={...(edits.youtube||{}),[k==='ytTitle'?'title':'description']:v}}else edits[k]=v};
  let saveT=null;const saveSoon=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{if(db)db.doc('clips/'+id).update({hook,pack:edits}).catch(()=>{})},800)};
  const tabs=q('[data-tabs]');TABS2.forEach(([k,l])=>{const t=document.createElement('button');t.type='button';t.className='ghost sm';t.textContent=l;t.onclick=()=>{tab=k;draw()};t.dataset.k=k;tabs.appendChild(t)});
  const draw=()=>{tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.k===tab)));ta.value=valOf(tab);ta.rows=tab==='ytTitle'?2:7;
    const plat=tab==='ytTitle'||tab==='ytDesc'?'youtube':tab;q('[data-m=c]').textContent=tab==='ytTitle'?ta.value.length+'/100 characters':tagNote(plat,ta.value).text};
  ta.oninput=()=>{setVal(tab,ta.value);saveSoon();const plat=tab==='ytTitle'||tab==='ytDesc'?'youtube':tab;q('[data-m=c]').textContent=tab==='ytTitle'?ta.value.length+'/100 characters':tagNote(plat,ta.value).text};
  hk.oninput=()=>{hook=hk.value;saveSoon()};draw();
  q('[data-a=copy]').onclick=()=>copyText(ta.value,q('[data-m=c]'),ta);
  // accounts
  const ab=q('[data-accts]');const drawAccts=()=>{const all=opAccounts();const ch=new Set(chosenAccounts().map(acctKey));ab.innerHTML='';
    if(!all.length){ab.innerHTML='<p class="msg">No accounts loaded yet.</p>';const lb=document.createElement('button');lb.type='button';lb.className='ghost sm';lb.textContent='Load my OpusClip accounts';
      lb.onclick=async()=>{lb.disabled=true;lb.textContent='Loading…';try{const r=await PB.opus.accounts();metaDocs.opusAccounts={accounts:r.accounts};drawAccts()}catch(e){q('[data-m=s]').textContent=e.message;lb.disabled=false;lb.textContent='Load my OpusClip accounts'}};ab.appendChild(lb);return}
    all.forEach(a=>{const l=document.createElement('label');l.className='acct';l.innerHTML='<input type="checkbox">'+(a.pic?'<img alt="">':'')+'<span></span>';l.querySelector('input').checked=ch.has(acctKey(a));l.querySelector('input').dataset.k=acctKey(a);
      if(a.pic)l.querySelector('img').src=a.pic;l.querySelector('span').textContent=platName(a.platform)+' · '+a.name;ab.appendChild(l)})};drawAccts();
  const picked=()=>{const ks=[...ab.querySelectorAll('input:checked')].map(x=>x.dataset.k);return opAccounts().filter(a=>ks.includes(acctKey(a)))};
  // state + buttons
  const drawState=()=>{const cc=clipsData[id]||c;const st=clipState(cc);const se=q('[data-f=state]');se.className='cstate '+(st.cls||'');se.textContent=st.t==='In reserve'||st.t==='Claude says skip'||st.t==='Skipped'?'Not planned':st.t.replace(/^(Planned|Scheduled) · /,'$1 for ');
    const done=['sent','posted'].includes(cc.status);q('[data-a=cancel]').hidden=cc.status!=='scheduled';q('[data-a=sched]').hidden=cc.status==='scheduled'||done;q('[data-a=now]').hidden=done||cc.status==='scheduled';q('[data-a=when]').hidden=done||cc.status==='scheduled';
    q('[data-a=done]').hidden=done;const sk=q('[data-a=skip]');sk.hidden=done||cc.status==='scheduled';sk.textContent=cc.skip||cc.post===false?'Use this clip':'Skip this clip'};drawState();
  const sm=q('[data-m=s]');
  const run=async(btn,fn)=>{if(!opReady(sm))return;btn.disabled=true;try{await fn()}catch(e){sm.textContent=e.message}btn.disabled=false;drawState()};
  const report=(r,verb)=>{const bad=(r.results||[]).filter(x=>!x.ok);sm.textContent=(r.ok?verb+' on '+(r.results||[]).filter(x=>x.ok).map(x=>platName(x.platform)).join(', ')+'.':'Nothing went through.')+(bad.length?' '+bad.map(x=>platName(x.platform)+': '+x.message).join(' · '):'')};
  q('[data-a=when]').onclick=()=>{const done=()=>{Object.assign(c,clipsData[id]||{});drawState()};done.msg=sm;clipSlotPicker(id,done)};
  q('[data-a=sched]').onclick=e=>run(e.target,async()=>{const t=clipAt(clipsData[id]||c);const acc=picked();
    if(!acc.length){sm.textContent='Tick at least one account to post to.';return}
    if(!t||t.getTime()<Date.now()+6*60000){sm.textContent='Pick a time first (Change time).';return}
    sm.textContent='Scheduling…';const r=await PB.opus.schedule(id,t.toISOString(),targetsFor(cur(),acc));if(r.ok)local(id,{status:'scheduled'});report(r,'Scheduled for '+dlabel(t)+' '+hm(t))});
  q('[data-a=now]').onclick=e=>run(e.target,async()=>{const acc=picked();if(!acc.length){sm.textContent='Tick at least one account to post to.';return}
    if(!confirm('Post this clip now to '+acc.map(a=>platName(a.platform)).join(', ')+'?'))return;sm.textContent='Posting…';const r=await PB.opus.schedule(id,null,targetsFor(cur(),acc));if(r.ok)local(id,{status:'sent'});report(r,'Posted')});
  q('[data-a=cancel]').onclick=e=>run(e.target,async()=>{sm.textContent='Cancelling…';const r=await PB.opus.cancel(id);if(r.cancelled)local(id,{status:'planned'});sm.textContent=r.cancelled?'Schedule cancelled. The clip stays in your plan; it’s not with OpusClip any more.':'Nothing to cancel.'+(r.errors&&r.errors.length?' '+r.errors[0]:'')});
  q('[data-a=done]').onclick=async()=>{if(!db)return;const at=(clipAt(c)||new Date()).toISOString();await db.doc('clips/'+id).update({status:'posted',plan:{at,locked:true,reminded:true}});local(id,{status:'posted'});sm.textContent='Marked as posted.';drawState()};
  q('[data-a=skip]').onclick=async()=>{const cc=clipsData[id]||c;await setSkip(id,!(cc.skip||cc.post===false));drawState()};
  q('[data-a=save]').onclick=e=>{const mv=q('[data-m=v]');e.target.disabled=true;mv.textContent='Fetching the video…';
    PB.opus.file(id).then(blob=>downloads.save({filename:(slug(hook||'clip').slice(0,50)||'clip')+'.mp4',data:blob})).then(()=>{mv.textContent=''}).catch(err=>{mv.textContent=err&&err.code==='declined'?'':(err.message||'Couldn’t save.')}).finally(()=>{e.target.disabled=false})};
  const close=()=>{clearTimeout(saveT);if(db)db.doc('clips/'+id).update({hook,pack:edits}).catch(()=>{});m.remove();opOpen=null;opSig='';if(curTab==='clips')renderClips()};
  q('[data-a=close]').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});
  m.appendChild(b);document.body.appendChild(m)}

// ---------- buttons ----------
$('#op-new').addEventListener('submit',async e=>{e.preventDefault();const m=$('#op-msg');if(!opReady(m))return;const b=$('#op-go');b.disabled=true;m.textContent='Sending to OpusClip…';
  try{const r=await PB.opus.create({url:$('#op-url').value.trim(),title:$('#op-title').value.trim(),length:$('#op-len').value,prompt:$('#op-prompt').value.trim()});
    opSel=r.id;opSig='';m.textContent='Started “'+r.title+'”. You’ll get an alert when the clips are ranked (usually 10–30 minutes).';e.target.reset()}
  catch(err){m.textContent=err.message}b.disabled=false});
$('#op-impgo').onclick=async()=>{const m=$('#op-msg');if(!opReady(m))return;const v=$('#op-imp').value.trim();if(!v)return;const b=$('#op-impgo');b.disabled=true;m.textContent='Bringing the clips in and ranking them (about a minute)…';
  try{const r=await PB.opus.import(v);opSel=r.id;opSig='';m.textContent=r.status==='ready'?r.count+' clips brought in, ranked and planned.':r.status==='processing'?'OpusClip hasn’t finished that one yet. It will come in by itself.':(r.message||'Done.');$('#op-imp').value=''}
  catch(err){m.textContent=err.message}b.disabled=false};
$('#op-check').onclick=async()=>{const m=$('#op-cmsg');if(!opReady(m)||!opSel)return;m.textContent='Checking with OpusClip…';try{const r=await PB.opus.check(opSel);m.textContent=r.status==='processing'?'Not ready yet. OpusClip is still working on it.':r.status==='ready'?'Up to date.':(r.message||r.status)}catch(e){m.textContent=e.message}};
$('#op-rerank').onclick=async()=>{const m=$('#op-cmsg');if(!opReady(m)||!opSel)return;if(!confirm('Ask Claude to rank these clips again? (about 3p)'))return;m.textContent='Ranking…';try{await PB.opus.check(opSel,true);m.textContent='Ranked again and the plan updated.'}catch(e){m.textContent=e.message}};
$('#op-replan').onclick=async()=>{const m=$('#op-planmsg');if(!opReady(m))return;m.textContent='Planning…';try{const r=await PB.opus.plan();m.textContent=r.planned+' clip'+(r.planned===1?'':'s')+' in the plan.'}catch(e){m.textContent=e.message}};
$('#op-schedall').onclick=async()=>{const m=$('#op-planmsg');if(!opReady(m))return;const acc=chosenAccounts();
  if(!acc.length){m.textContent='Choose which accounts to post to first (Plan settings and accounts, below).';$('#op-cfg').open=true;renderOpCfg();return}
  const due=clipsUpcoming().filter(x=>x.c.status==='planned'&&x.t.getTime()>Date.now()+6*60000&&x.t.getTime()<Date.now()+3*864e5);
  if(!due.length){m.textContent='Nothing left to schedule in the next 3 days.';return}
  if(!confirm('Schedule '+due.length+' clip'+(due.length>1?'s':'')+' to '+acc.map(a=>platName(a.platform)).join(', ')+'? OpusClip will post each one at its planned time.'))return;
  const btn=$('#op-schedall');btn.disabled=true;let ok=0;const bad=[];
  for(let i=0;i<due.length;i++){const x=due[i];m.textContent='Scheduling '+(i+1)+' of '+due.length+'…';
    try{const r=await PB.opus.schedule(x.id,x.t.toISOString(),targetsFor(x.c,acc));if(r.ok)ok++;(r.results||[]).filter(y=>!y.ok).forEach(y=>bad.push(platName(y.platform)+': '+y.message))}catch(e){bad.push(e.message)}}
  btn.disabled=false;m.textContent=ok+' of '+due.length+' scheduled.'+(bad.length?' Problems: '+[...new Set(bad)].slice(0,3).join(' · '):'')};

// ---------- plan settings ----------
let opTplLoaded=false;
function renderOpCfg(){const t=$('#op-times');if(!t||document.activeElement===t)return;t.value=clipTimes().join(', ');$('#op-days').value=settings.clipDays||7;
  const all=opAccounts();const ch=new Set(chosenAccounts().map(acctKey));const ab=$('#op-accts');ab.innerHTML='';
  if(!all.length)ab.innerHTML='<p class="msg">Not loaded yet.</p>';
  all.forEach(a=>{const l=document.createElement('label');l.className='acct';l.innerHTML='<input type="checkbox">'+(a.pic?'<img alt="">':'')+'<span></span>';const i=l.querySelector('input');i.checked=ch.has(acctKey(a));i.dataset.k=acctKey(a);
    if(a.pic)l.querySelector('img').src=a.pic;l.querySelector('span').textContent=platName(a.platform)+' · '+a.name;ab.appendChild(l)});
  const sel=$('#op-tpl');if(settings.opusTemplate&&![...sel.options].some(o=>o.value===settings.opusTemplate)){const o=document.createElement('option');o.value=settings.opusTemplate;o.textContent='Saved template';sel.appendChild(o)}sel.value=settings.opusTemplate||''}
$('#op-cfg').addEventListener('toggle',async()=>{if(!$('#op-cfg').open)return;renderOpCfg();if(opTplLoaded||!(window.PB&&PB.opus))return;opTplLoaded=true;
  try{const r=await PB.opus.templates();const sel=$('#op-tpl');(r.templates||[]).forEach(t=>{if([...sel.options].some(o=>o.value===t.id))return;const o=document.createElement('option');o.value=t.id;o.textContent=t.name;sel.appendChild(o)});sel.value=settings.opusTemplate||''}catch(e){}});
$('#op-acctload').onclick=async()=>{const m=$('#op-cfgmsg');if(!opReady(m))return;m.textContent='Loading…';try{const r=await PB.opus.accounts();metaDocs.opusAccounts={accounts:r.accounts};renderOpCfg();
  m.textContent=r.accounts.length?r.accounts.length+' account'+(r.accounts.length>1?'s':'')+' found. Untick any you don’t want clips going to, then Save.':'No accounts found. Connect them on the OpusClip website (Social accounts) first.'}catch(e){m.textContent=e.message}};
$('#op-savecfg').onclick=async()=>{const m=$('#op-cfgmsg');const times=$('#op-times').value.split(/[,\s]+/).map(s=>s.trim()).filter(s=>/^\d{1,2}:\d{2}$/.test(s)).map(s=>s.padStart(5,'0')).sort();
  const patch={clipTimes:times.length?[...new Set(times)]:DEF_CLIP_TIMES,clipDays:Math.max(1,Math.min(14,Number($('#op-days').value)||7)),opusTemplate:$('#op-tpl').value||''};
  if(opAccounts().length)patch.opusTargets=[...document.querySelectorAll('#op-accts input:checked')].map(x=>x.dataset.k);
  settings={...settings,...patch};if(!db){m.textContent='Can’t save in this view.';return}
  try{await db.doc('meta/settings').update(patch)}catch(e){try{await db.doc('meta/settings').set({...settings})}catch(e2){m.textContent='Could not save.';return}}
  m.textContent='Saved. Updating the plan…';try{const r=await PB.opus.plan();m.textContent='Saved. '+r.planned+' clips in the plan.'}catch(e){m.textContent='Saved.'}};

