
// ================= Quick post: card → Facebook, Instagram and X in one tap =================
const QP_PLATS=[['facebook','Facebook'],['instagram','Instagram'],['x','X']];
const QP_MAX={facebook:4,instagram:4,x:4};
let qpStatus=null,qpLog={},qpLogOn=false;
const fixedTags=plat=>{const f=settings.fixedTags||{};return (String(f.all!=null?f.all:(f.facebook||'')).match(/#[A-Za-z0-9_]+/g)||[]).slice(0,2)};
function withTags(body,plat,auto,pre){const seen=new Set();const out=[];
  for(const t of [...(pre||[]).slice(0,4-Math.min(2,fixedTags(plat).length)),...fixedTags(plat),...(pre||[]),...auto]){const k=t.toLowerCase();if(!t||seen.has(k))continue;seen.add(k);out.push(t);if(out.length>=QP_MAX[plat])break}
  return (body.trim()+(out.length?'\n\n'+out.join(' '):'')).trim()}
// X counts most emoji as 2 characters
const xLen=t=>[...String(t)].reduce((n,ch)=>n+(ch.codePointAt(0)>0x2000?2:1),0);
function xCaption(p,pre){const body=stripTags(captionBody(p)).replace(/\n{3,}/g,'\n\n');const auto=tagsFor(p,'tiktok').filter(t=>!/tiktok|fyp/i.test(t));
  let text=withTags(body,'x',auto,pre);while(xLen(text)>280){const parts=body.split('\n\n');if(parts.length>1){parts.splice(parts.length-2,1)}else break;text=withTags(parts.join('\n\n'),'x',auto,pre);if(parts.length<=1)break}
  if(xLen(text)>280){let b=body;while(xLen(withTags(b+'…','x',auto,pre))>280&&b.length>20)b=b.slice(0,-5);text=withTags(b+'…','x',auto,pre)}return text}
// ---------- match hashtags ----------
const qslug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const tagKeyOf=m=>m.date+'-'+qslug(m.home)+'-v-'+qslug(m.away);
function matchOf(p){if(!p)return null;const f=p.fields||{};let home=f.home,away=f.away;
  if(!home||!away){const t=String(p.title||'').match(/([A-Z][\w .'’-]+?)\s+(?:v|vs|\d+\s*[-–]\s*\d+)\s+([A-Z][\w .'’-]+?)(?:\)|$|:)/);if(t){home=t[1].trim();away=t[2].trim()}}
  if(!home||!away)return null;const date=/^\d{4}-\d{2}-\d{2}$/.test(p.batch||'')?p.batch:ymd(new Date());return {home:String(home),away:String(away),comp:String(f.tag||'').split('·')[0].trim(),date}}
function findTags(m){if(!m)return null;const k=tagKeyOf(m);if(matchTags[k])return matchTags[k];
  // same teams within a day either side (late kick-offs, games added the day before)
  return Object.values(matchTags).find(t=>qslug(t.home)===qslug(m.home)&&qslug(t.away)===qslug(m.away)&&Math.abs(Date.parse(t.date)-Date.parse(m.date))<=864e5)||null}
// any other post: key it by the clubs/people it's about, and reuse a look-up for 12 hours
function topicOf(p){if(!p||matchOf(p))return null;let P;try{P=tagPool(p)}catch(e){return null}
  const bits=[...P.clubs.slice(0,2),...P.people.slice(0,2),...P.league.slice(0,1)].filter(Boolean);
  const key=bits.length?bits.join('|'):String(p.title||'').split(/\s+/).slice(0,5).join(' ');if(!key)return null;
  return {topic:true,key,title:p.title||'',caption:stripTags(captionBody(p)).slice(0,600)}}
function findTopicTags(t){if(!t)return null;const d=matchTags['topic-'+qslug(t.key).slice(0,80)];return d&&Date.now()-Date.parse(d.at)<12*3600e3?d:null}
const matchTagsFor=(t,plat)=>t?[...(t.match?[t.match]:[]),...(Array.isArray(t.tags)&&t.tags.length?t.tags:(t[plat]||[]))]:[];
let qpOnTags=null;function qpTagsChanged(){if(qpOnTags)qpOnTags();if(curTab==='quick')drawQpTags()}
function qpCaptions(p){if(!p)return {facebook:withTags('','facebook',[]),instagram:withTags('','instagram',[]),x:withTags('','x',[])};const pk=packOf(p);
  const mt=findTags(matchOf(p))||findTopicTags(topicOf(p));const who=((p.fields||{}).scorer&&typeof camelTag==='function')?[camelTag(p.fields.scorer)].filter(Boolean):[];
  const pre=plat=>[...matchTagsFor(mt,plat),...who];
  const fb=withTags(stripTags(pk.facebook),'facebook',tagsFor(p,'facebook'),pre('facebook')),ig=withTags(stripTags(pk.instagram),'instagram',tagsFor(p,'instagram'),pre('instagram'));
  return {facebook:fb,instagram:ig,x:xCaption(p,pre('x'))}}
async function qpLoadStatus(force){if(!(window.PB&&PB.social))return null;if(qpStatus&&!force)return qpStatus;try{qpStatus=await PB.social.status()}catch(e){qpStatus={error:e.message}}return qpStatus}

function openQuickPost({blob,post,title}){const p=post?posts[post]:null;const old=document.getElementById('qpmodal');if(old)old.remove();
  const m=document.createElement('div');m.className='modal';m.id='qpmodal';const b=document.createElement('div');b.className='qpm';const url=URL.createObjectURL(blob);
  const caps=qpCaptions(p);const picked=new Set(Array.isArray(settings.quickTargets)&&settings.quickTargets.length?settings.quickTargets:['facebook','instagram','x']);let tab=null;
  b.innerHTML=`<div><img alt="The card that will be posted"><div class="row" style="margin-top:8px"><button class="ghost sm" data-a="close" type="button">Close</button></div></div>
    <div style="display:grid;gap:12px;align-content:start">
      <h3></h3>
      <div class="qplat"></div>
      <p class="msg" data-m="t" style="margin:0"></p>
      <div class="pills" data-tabs></div>
      <textarea aria-label="Caption"></textarea>
      <p class="msg" data-m="c" style="margin:0"></p>
      <button class="qpbig" data-a="go" type="button">Post now</button>
      <div class="qres"></div>
    </div>`;
  const q=s=>b.querySelector(s);q('img').src=url;q('h3').textContent=p?(p.title||'Post'):(title||'Your image');
  const ta=q('textarea');const plats=q('.qplat'),tabs=q('[data-tabs]');
  const conn=k=>{const s=qpStatus||{};return k==='x'?!!s.x:k==='instagram'?!!s.instagram:!!s.facebook};
  const draw=()=>{plats.innerHTML='';tabs.innerHTML='';const on=QP_PLATS.filter(([k])=>picked.has(k));if(!tab||!picked.has(tab))tab=on.length?on[0][0]:null;
    QP_PLATS.forEach(([k,l])=>{const lab=document.createElement('label');const ok=!qpStatus||conn(k);lab.className=ok?'':'off';lab.innerHTML='<input type="checkbox"><span></span>';const i=lab.querySelector('input');i.checked=picked.has(k);
      lab.querySelector('span').textContent=l+(qpStatus&&!ok?' (not connected)':'');i.onchange=()=>{i.checked?picked.add(k):picked.delete(k);draw()};plats.appendChild(lab)});
    on.forEach(([k,l])=>{const t=document.createElement('button');t.type='button';t.className='ghost sm';t.textContent=l+' caption';t.setAttribute('aria-pressed',String(k===tab));t.onclick=()=>{tab=k;draw()};tabs.appendChild(t)});
    ta.hidden=!tab;if(tab)ta.value=caps[tab];count();q('[data-a=go]').disabled=!on.length};
  const count=()=>{const c=q('[data-m=c]');if(!tab){c.textContent='Tick at least one platform.';return}const n=countTags(ta.value);
    c.textContent=tab==='x'?xLen(ta.value)+'/280 characters · '+n+' hashtag'+(n===1?'':'s'):tagNote(tab,ta.value).text;c.style.color=(tab==='x'&&xLen(ta.value)>280)||n>QP_MAX[tab]?'var(--red)':''};
  const edited=new Set();ta.oninput=()=>{if(tab){caps[tab]=ta.value;edited.add(tab)}count()};
  const mm=matchOf(p),tp=mm?null:topicOf(p);const tl=q('[data-m=t]');const found=()=>mm?findTags(mm):findTopicTags(tp);const label=mm?mm.home+' v '+mm.away:'this story';
  const drawTags=()=>{const t=found();if(!mm&&!tp){tl.textContent='';return}
    if(t){tl.innerHTML='';const s1=document.createElement('span');s1.textContent='Match hashtags: '+[t.match,...(t.x||[]),...(t.instagram||[])].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' ')+' · looked up '+ago(t.at)+'. ';s1.textContent=(mm?'Match':'Story')+s1.textContent.slice(5);tl.appendChild(s1);
      const rb=document.createElement('button');rb.type='button';rb.className='ghost sm';rb.textContent='Look again';rb.onclick=()=>research(true);tl.appendChild(rb)}
    else tl.textContent='Looking up the hashtags being used for '+label+'…'};
  const research=async(force)=>{if((!mm&&!tp)||!(window.PB&&PB.social))return;if(found()&&!force)return;tl.textContent='Looking up the hashtags being used for '+label+'… (about 15 seconds)';
    try{const d=await PB.social.tags(mm||tp);matchTags[mm?tagKeyOf(d):'topic-'+qslug(tp.key).slice(0,80)]=d;apply()}catch(e){tl.textContent='Couldn’t look up the match hashtags ('+e.message+'). The usual tags are used instead.'}};
  const apply=()=>{const fresh=qpCaptions(p);QP_PLATS.forEach(([k])=>{if(!edited.has(k))caps[k]=fresh[k]});if(tab&&!edited.has(tab))ta.value=caps[tab];count();drawTags()};
  qpOnTags=()=>{if(document.body.contains(m))apply()};drawTags();research(false);
  const res=q('.qres');
  q('[data-a=go]').onclick=async e=>{const btn=e.target;const on=QP_PLATS.filter(([k])=>picked.has(k)).map(([k])=>k);if(!on.length)return;
    if(on.includes('x')&&xLen(caps.x)>280){tab='x';draw();q('[data-m=c]').textContent='The X caption is over 280 characters. Shorten it first.';return}
    if(!(window.PB&&PB.social)){res.innerHTML='<div class="bad">Posting works in the installed Studio.</div>';return}
    btn.disabled=true;btn.textContent='Posting…';res.innerHTML='<div>Sending to '+on.map(k=>QP_PLATS.find(x=>x[0]===k)[1]).join(', ')+'… Instagram can take up to 30 seconds.</div>';
    try{const targets={};on.forEach(k=>targets[k]=caps[k]);const r=await PB.social.post({blob,post:post||null,title:p?p.title:(title||''),targets});res.innerHTML='';
      let okN=0;on.forEach(k=>{const x=r.results[k]||{};const d=document.createElement('div');const l=QP_PLATS.find(y=>y[0]===k)[1];
        if(x.ok){okN++;d.innerHTML='<span class="ok">✓ '+l+'</span> · <a target="_blank" rel="noopener">View post</a>';d.querySelector('a').href=x.url}else{d.innerHTML='<span class="bad">✗ '+l+'</span> · <span></span>';d.querySelector('span:last-child').textContent=x.message||'Failed'}res.appendChild(d)});
      btn.textContent=okN===on.length?'Posted ✓':'Try the failed ones again';btn.disabled=okN===on.length;
      if(okN){const done=on.filter(k=>r.results[k]&&r.results[k].ok);done.forEach(k=>picked.delete(k));if(p){p.status='posted';try{renderList();studioRefresh()}catch(err){}}draw();btn.disabled=!picked.size;if(!picked.size)btn.textContent='Posted ✓'}
      try{if(db)db.doc('meta/settings').update({quickTargets:on})}catch(err){}}
    catch(err){res.innerHTML='';const d=document.createElement('div');d.className='bad';d.textContent=err.message;res.appendChild(d);btn.disabled=false;btn.textContent='Post now'}};
  const close=()=>{m.remove();URL.revokeObjectURL(url);qpOnTags=null};q('[data-a=close]').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});
  m.appendChild(b);document.body.appendChild(m);draw();
  qpLoadStatus().then(()=>draw())}

// after making a GOAL / half-time / full-time card: generate it and open the post screen
function autoQuick(id){const t0=Date.now();const tick=()=>{const n=nodes[id];if(!n){if(Date.now()-t0<8000)return setTimeout(tick,300);return}
    const after=n.querySelector('.after');if(!n._qpStarted){n._qpStarted=true;n.scrollIntoView({behavior:'smooth',block:'start'});n.querySelector('.gen').click()}
    if(after&&!after.hidden){setTimeout(()=>n.querySelector('.qpost').click(),400);return}
    if(Date.now()-t0<15000)setTimeout(tick,300)};setTimeout(tick,800)}

// ---------- page ----------
async function renderQuick(){if(!$('#qp-conn'))return;const ft=settings.fixedTags||{};const ti=$('#qp-t-all');if(ti&&document.activeElement!==ti)ti.value=ft.all!=null?ft.all:(ft.facebook||'');
  $('#qp-auto').checked=settings.quickAuto!==false;
  if(!qpLogOn&&db){qpLogOn=true;db.collection('social').onSnapshot(s=>{qpLog={};s.docs.forEach(d=>{qpLog[d.id]=d.data()});drawQpLog()},()=>{})}
  drawQpLog();drawQpTags();const c=$('#qp-conn');c.innerHTML='<p class="msg">Checking…</p>';const s=await qpLoadStatus(true);c.innerHTML='';
  if(!s||s.error){c.innerHTML='<p class="msg">'+esc((s&&s.error)||'Posting works in the installed Studio.')+'</p>';return}
  const row=(name,col,on,sub,btn)=>{const r=document.createElement('div');r.className='econn';r.innerHTML=`<span class="dot" style="background:${col}"></span><div><b></b><small></small></div><div class="row"></div>`;r.querySelector('b').textContent=name;r.querySelector('small').textContent=sub;if(btn)r.querySelector('.row').appendChild(btn);c.appendChild(r)};
  const mb=document.createElement('button');mb.type='button';mb.className=s.facebook?'ghost sm':'sm';mb.textContent=s.facebook?'Reconnect':'Connect Facebook & Instagram';
  mb.onclick=async()=>{mb.disabled=true;try{await PB.earnings.connect('meta')}catch(e){mb.disabled=false;$('#qp-smsg').textContent=e.message}};
  row('Facebook','#2f6fdb',!!s.facebook,s.facebook?'Page: '+s.facebook.name:(s.metaApp?'Not connected yet.':'Add the Meta app keys first (setup guide, step 10).'),mb);
  row('Instagram','#c13584',!!s.instagram,s.instagram?'@'+s.instagram.username:(s.facebook?'No Instagram account linked to this page. Link it in Instagram, then Reconnect.':'Connects with Facebook.'),null);
  row('X','#111',!!s.x,s.x?'Connected with your X keys.':'Add the four X keys (setup guide, step 11).',null)}
function drawQpLog(){const box=$('#qp-log');if(!box)return;box.innerHTML='';const L={facebook:'FB',instagram:'IG',x:'X'};
  Object.values(qpLog).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,15).forEach(e=>{const rs=e.results||{};const tags=Object.entries(rs).map(([k,r])=>(r.ok?'✓ ':'✗ ')+L[k]).join('  ');
    const first=Object.values(rs).find(r=>r.ok);const b=hItem(new Date(e.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),e.title||'Image',new Date(e.at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}),{t:tags,cls:Object.values(rs).some(r=>!r.ok)?'live':''},()=>{if(first)window.open(first.url,'_blank','noopener')});box.appendChild(b)});
  if(!box.children.length)box.innerHTML='<p class="hempty">Nothing posted from the Studio yet.</p>'}
function drawQpTags(){const box=$('#qp-tags');if(!box)return;box.innerHTML='';const today=ymd(new Date());
  Object.values(matchTags).filter(t=>!t.topic&&t.date>=ymd(new Date(Date.now()-864e5))).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,8).forEach(t=>{
    const all=[t.match,...(t.x||[]),...(t.instagram||[]),...(t.facebook||[])].filter((v,i,a)=>v&&a.indexOf(v)===i);
    const b=hItem(t.date===today?'Today':new Date(t.date).toLocaleDateString('en-GB',{weekday:'short'}),t.home+' v '+t.away+': '+all.join(' '),(t.why||'')+' · looked up '+ago(t.at),{t:'Look again'},async()=>{$('#qp-tmsg').textContent='Looking again…';try{await PB.social.tags({home:t.home,away:t.away,comp:t.comp,date:t.date});$('#qp-tmsg').textContent='Updated.'}catch(e){$('#qp-tmsg').textContent=e.message}});box.appendChild(b)});
  if(!box.children.length)box.innerHTML='<p class="hempty">No games looked up yet.</p>'}
$('#qp-tform').addEventListener('submit',async e=>{e.preventDefault();const m=$('#qp-tmsg');if(!(window.PB&&PB.social)){m.textContent='Works in the installed Studio.';return}
  const home=$('#qp-th').value.trim(),away=$('#qp-ta').value.trim();if(!home||!away){m.textContent='Type both teams.';return}m.textContent='Searching (about 15 seconds)…';
  try{const d=await PB.social.tags({home,away,comp:$('#qp-tc').value.trim(),date:ymd(new Date())});matchTags[tagKeyOf(d)]=d;drawQpTags();m.textContent='Found: '+[d.match,...d.x].filter(Boolean).join(' ')}catch(err){m.textContent=err.message}});
$('#qp-check').onclick=()=>renderQuick();
$('#qp-save').onclick=async()=>{const m=$('#qp-smsg');const all=(($('#qp-t-all').value.match(/#?[A-Za-z0-9_]+/g))||[]).map(t=>t.startsWith('#')?t:'#'+t).slice(0,2).join(' ');const ft={all,facebook:all,instagram:all,x:all};
  const patch={fixedTags:ft,quickAuto:$('#qp-auto').checked};settings={...settings,...patch};if(!db)return;
  try{await db.doc('meta/settings').update(patch);m.textContent='Saved.'}catch(e){try{await db.doc('meta/settings').set({...settings});m.textContent='Saved.'}catch(e2){m.textContent='Could not save.'}}};
$('#qp-file').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
  try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(f)});
    const blob=await shrinkBlob(img,2048,'image/jpeg');openQuickPost({blob,post:null,title:f.name.replace(/\.[a-z0-9]+$/i,'')})}catch(err){$('#qp-smsg').textContent='Couldn’t read that image.'}e.target.value=''});
if(window.__mk)window.__qp={open:openQuickPost};
