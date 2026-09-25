
// ================= Studio: home, calendar, photo library, tables, live Match Centre, settings, alerts =================
const ICONS={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',posts:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',photo:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M20.5 9.5L16 10M17 19l-2.5-4.5M7 19l2.5-4.5M3.5 9.5L8 10"/>',bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',book:'<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6"/><path d="M20 4v14h-6"/>',cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',money:'<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.4-1.3 2.2-3 2.2-1.5 0-2.6-.6-3.1-1.6M12 5.5V7m0 10v1.5"/>',clip:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 9l5 3-5 3z"/>',more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'};
document.querySelectorAll('[data-ico]').forEach(b=>{const p=ICONS[b.dataset.ico];if(p)b.insertAdjacentHTML('afterbegin','<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>')});

let earnDays={},clipsData={},opusProjects={},matches={},tablesData={},scorersData={},photoLib={},metaDocs={},tableComp='PL',mFilter='today',calOffset=0,goalOpen=null;
const DEF_SLOTS=['08:00','12:30','18:00','20:30'];
const DEF_TEAMS=['Arsenal','Chelsea','Liverpool','Manchester City','Manchester United','Tottenham','Newcastle','Aston Villa','Nottingham Forest','England'];
const COMP_NAMES={PL:'Premier League',ELC:'Championship',CL:'Champions League',WC:'World Cup',EC:'Euros'};
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const hm=d=>pad2(d.getHours())+':'+pad2(d.getMinutes());
const dlabel=d=>d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const slotsList=()=>Array.isArray(settings.slots)&&settings.slots.length?settings.slots:DEF_SLOTS;
const teamsList=()=>Array.isArray(settings.watchTeams)&&settings.watchTeams.length?settings.watchTeams:DEF_TEAMS;
const compsList=()=>Array.isArray(settings.alertComps)&&settings.alertComps.length?settings.alertComps:['PL','CL','WC','EC'];
function isWatched(m){const n=[m.home&&m.home.name,m.home&&m.home.short,m.away&&m.away.name,m.away&&m.away.short].join(' | ').toLowerCase();return compsList().includes(m.comp)&&teamsList().some(t=>t&&n.includes(t.toLowerCase()))}
function postTime(p){if(p.slot){const t=new Date(p.slot);if(!isNaN(t))return t}
  const m=String(p.when||'').match(/(\d{1,2})\s+([A-Za-z]{3,})[^0-9]*?(\d{1,2}):(\d{2})/);if(!m)return null;const mi=MONTHS.indexOf(m[2].slice(0,3).toLowerCase());if(mi<0)return null;
  const y=+(String(p.batch||'').slice(0,4))||new Date().getFullYear();return new Date(y,mi,+m[1],+m[3],+m[4])}
const liveNow=m=>m.status==='IN_PLAY'||m.status==='PAUSED';
function mStatus(m){if(m.status==='IN_PLAY')return '<span class="lv">● LIVE'+(m.minute?' '+esc(m.minute)+'′':'')+'</span>';if(m.status==='PAUSED')return '<span class="lv">HALF-TIME</span>';if(m.status==='FINISHED')return 'FULL TIME';
  if(['POSTPONED','SUSPENDED','CANCELLED'].includes(m.status))return esc(m.status.toLowerCase());const d=new Date(m.utcDate);return 'KO '+hm(d)}
const gbp=(usd)=>'£'+(Number(usd||0)*((window.PB&&PB.config&&PB.config.usdToGbp)||0.78)).toFixed(2);
function monthUsage(doc){const d=metaDocs[doc];const mo=ymd(new Date()).slice(0,7);return d&&d.month===mo?d:{usd:0,count:0}}

function studioBoot(){
  if(!db)return;
  const sub=(c,fn)=>db.collection(c).onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=JSON.parse(JSON.stringify(d.data()))});fn(o);studioRefresh()},()=>{});
  sub('matches',o=>{matches=o;if(pendingHash)handleHash()});sub('tables',o=>{tablesData=o});sub('scorers',o=>{scorersData=o});sub('photos',o=>{photoLib=o});sub('meta',o=>{metaDocs=o});sub('earnings',o=>{earnDays=o});sub('clips',o=>{clipsData=o;if(pendingHash)handleHash()});sub('opus',o=>{opusProjects=o});
  if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='open'){try{location.hash=new URL(e.data.url).hash}catch(err){}}});
}
let pendingHash=/\//.test(location.hash);
window.addEventListener('hashchange',()=>handleHash());
function handleHash(){const h=(location.hash||'').slice(1);const [kind,id]=h.split('/');if(!id){if(TABS.includes(kind)&&kind!==curTab)showTab(kind,true);return}
  if(kind==='clip'||kind==='clipset'){if(kind==='clip'&&!clipsData[id]){pendingHash=true;showTab('clips',true);return}pendingHash=false;showTab('clips',true);if(kind==='clip'){openClip(id)}else{opSel=id;renderClips()}try{history.replaceState(null,'','#clips')}catch(e){}return}
  if(kind==='post'){if(!posts[id]){pendingHash=true;return}pendingHash=false;openPost(id);try{history.replaceState(null,'','#posts')}catch(e){}return}
  const m=matches[id];if(!m){pendingHash=true;showTab('match',true);return}pendingHash=false;
  if(kind==='goal'){mFilter='today';showTab('match',true);goalOpen=id;renderLive();setTimeout(()=>{const c=document.getElementById('mc-'+id);if(c)c.scrollIntoView({behavior:'smooth',block:'center'})},200)}
  else if(kind==='ht'||kind==='ft'){showTab('match',true);makeResultCard(m,kind==='ht'?'HALF-TIME':'FULL TIME')}
  try{history.replaceState(null,'','#'+curTab)}catch(e){}}
function openPost(id){if(!posts[id]){showTab('posts');return}if(posts[id].status==='posted'&&filter==='todo'){filter='all';document.querySelectorAll('[data-f]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.f==='all')));renderList()}
  showTab('posts',true);setTimeout(()=>{const n=nodes[id];if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},250)}
function studioRefresh(){if(pendingHash)handleHash();const todo=order.filter(i=>posts[i].status!=='posted').length;const nb=$('#nb-posts');if(nb)nb.textContent=todo?String(todo):'';
  const nc=$('#nb-clips');if(nc){const n=clipsUpcoming().filter(x=>x.c.status==='planned'&&ymd(x.t)===ymd(new Date())).length;nc.textContent=n?String(n):''}
  const lv=Object.values(matches).filter(liveNow).length;const nl=$('#nb-live');if(nl)nl.textContent=lv?String(lv):'';
  studioShow(curTab,true)}
function studioShow(t,soft){if(t==='home')renderHome();else if(t==='calendar')renderCal();else if(t==='library'&&!soft)renderLib();else if(t==='tables')renderTables();else if(t==='match'){if(!(soft&&document.querySelector('#mlive .gform:not([hidden])')))renderLive()}else if(t==='settings'&&!soft)renderSettings();else if(t==='clips')renderClips(soft);else if(t==='earnings')renderEarnings()}
$('#quick-new').onclick=()=>showTab('create');$('#quick-goal').onclick=()=>{mFilter='today';showTab('match')};

// ---------- Home ----------
function hItem(time,title,sub,tag,onClick){const b=document.createElement('button');b.type='button';b.className='hitem';b.innerHTML=`<span class="t"></span><span><b></b><small></small></span>${tag?`<span class="tag ${tag.cls||''}"></span>`:''}`;
  b.querySelector('.t').textContent=time;b.querySelector('b').textContent=title;b.querySelector('small').textContent=sub||'';if(tag)b.querySelector('.tag').textContent=tag.t;b.onclick=onClick;return b}
function renderHome(){const k=$('#h-kpis');if(!k)return;const now=new Date(),today=ymd(now);
  const todo=order.map(i=>({id:i,p:posts[i],t:postTime(posts[i])})).filter(x=>x.p.status!=='posted');
  const todayN=todo.filter(x=>!x.t||ymd(x.t)===today).length;const live=Object.values(matches).filter(liveNow);
  const br=Object.values(breaking).filter(b=>Date.now()-(Date.parse(b.publishedAt)||0)<3*3600e3).length;
  const cu=monthUsage('usage'),hu=monthUsage('hfusage');const cap=(window.PB&&PB.config&&PB.config.budgetGbp)||10,hcap=(window.PB&&PB.config&&PB.config.hfBudgetGbp)||5;
  const kp=[['To post today',todayN,''],['Live now',live.length,live.length?live.map(m=>m.home.short+' '+m.hs+'-'+m.as+' '+m.away.short).slice(0,2).join(' · '):'No games on'],['Breaking (3h)',br,''],['Clips planned',clipsUpcoming().length,'next 7 days'],['Earned this month',earnMonthTotal().txt,earnMonthTotal().sub],['Claude this month',gbp(cu.usd),'of £'+cap+' budget'],['Higgsfield this month',gbp(hu.usd),(hu.count||0)+' made · £'+hcap+' budget']];
  k.innerHTML=kp.map(([l,v,s])=>`<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span>${s?`<small>${esc(s)}</small>`:''}</div>`).join('');
  const nx=$('#h-next');nx.innerHTML='';todo.sort((a,b)=>(a.t?a.t.getTime():0)-(b.t?b.t.getTime():0)).slice(0,6).forEach(x=>nx.appendChild(hItem(x.t?(ymd(x.t)===today?hm(x.t):x.t.toLocaleDateString('en-GB',{weekday:'short'})):'Now',x.p.title||'',x.p.format||'',x.p.auto?{t:'Auto',cls:''}:null,()=>openPost(x.id))));
  clipsUpcoming().filter(x=>ymd(x.t)===today).forEach(x=>{const b=hItem(hm(x.t),'🎬 '+(x.c.hook||x.c.title||'Clip'),x.c.status==='scheduled'?'Clip · scheduled on OpusClip':'Clip · post it yourself',x.c.status==='scheduled'?{t:'Auto',cls:''}:null,()=>openClip(x.id));nx.insertBefore(b,[...nx.children].find(el=>{const t=(el.querySelector('.t')||{}).textContent||'';return t!=='Now'&&(!/^\d\d:\d\d$/.test(t)||t>hm(x.t))})||null)});
  if(!nx.children.length)nx.innerHTML='<p class="hempty">Nothing waiting. New posts arrive with the morning news check.</p>';
  const g=$('#h-games');g.innerHTML='';const up=Object.values(matches).filter(m=>liveNow(m)||(['TIMED','SCHEDULED'].includes(m.status)&&Date.parse(m.utcDate)<Date.now()+2*864e5&&Date.parse(m.utcDate)>Date.now()-3*3600e3)||(m.status==='FINISHED'&&Date.now()-Date.parse(m.utcDate)<5*3600e3))
    .sort((a,b)=>(liveNow(b)-liveNow(a))||(isWatched(b)-isWatched(a))||a.utcDate.localeCompare(b.utcDate)).slice(0,6);
  up.forEach(m=>{const d=new Date(m.utcDate);g.appendChild(hItem(liveNow(m)?`${m.hs}-${m.as}`:m.status==='FINISHED'?`${m.hs}-${m.as}`:hm(d),m.home.short+' v '+m.away.short,(COMP_NAMES[m.comp]||m.compName||'')+(liveNow(m)||m.status==='FINISHED'?'':' · '+(ymd(d)===today?'Today':dlabel(d))),liveNow(m)?{t:m.status==='PAUSED'?'HT':'LIVE'+(m.minute?' '+m.minute+'′':''),cls:'live'}:m.status==='FINISHED'?{t:'FT'}:null,()=>{mFilter='today';showTab('match')}))});
  if(!g.children.length)g.innerHTML=`<p class="hempty">${metaDocs.system&&metaDocs.system.football?'No games in the next two days.':'Live football data isn’t connected yet (setup guide, step 8).'}</p>`;
  const bx=$('#h-break');bx.innerHTML='';Object.entries(breaking).map(([id,b])=>({id,...b})).sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,3)
    .forEach(b=>bx.appendChild(hItem('🔥'.repeat(Math.min(3,Math.max(1,Math.round((+b.heat||3)/1.7)))),b.headline||'',ago(b.publishedAt),{t:TREND[b.trend]?TREND[b.trend].replace(/^\S+\s/,''):'',cls:b.trend==='just-broke'?'live':''},()=>showTab('breaking'))));
  if(!bx.children.length)bx.innerHTML='<p class="hempty">Nothing breaking right now.</p>';
  const hp=$('#h-push');if(hp&&window.PB&&PB.push&&PB.push.supported())PB.push.state().then(s=>{hp.hidden=s==='on';hp.onclick=()=>showTab('settings')}).catch(()=>{})}

// ---------- Calendar ----------
function weekStart(off){const d=new Date();d.setHours(0,0,0,0);const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow+off*7);return d}
async function movePost(id,day,time){const [h,mi]=time.split(':').map(Number);const d=new Date(day);d.setHours(h,mi,0,0);const p=posts[id];if(!p)return;
  p.slot=d.toISOString();p.when=dlabel(d)+' · '+time;p.reminded=false;renderCal();await save(id,{slot:p.slot,when:p.when,reminded:false});$('#cal-msg').textContent='Moved “'+(p.title||'')+'” to '+p.when+'.'}
function slotPicker(id){const m=document.createElement('div');m.className='modal';const box=document.createElement('div');box.style.cssText='background:#fff;padding:16px;border-radius:10px;max-width:520px;width:100%;display:grid;gap:10px';
  box.innerHTML='<h3 style="color:var(--navy);margin:0">Move to…</h3><div class="slotpick"></div><button type="button" class="ghost">Cancel</button>';const g=box.querySelector('.slotpick');
  const start=new Date();start.setHours(0,0,0,0);for(let i=0;i<14;i++){const d=new Date(start);d.setDate(d.getDate()+i);slotsList().forEach(t=>{const b=document.createElement('button');b.type='button';b.className='ghost sm';b.textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric'})+' '+t;b.onclick=()=>{m.remove();movePost(id,d,t)};g.appendChild(b)})}
  box.querySelector('button.ghost:last-child').onclick=()=>m.remove();m.appendChild(box);m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m)}
function calCard(id,p,t){const c=document.createElement('div');c.className='cpost'+(p.status==='posted'?' done':'')+(p.auto?' auto':'');c.draggable=true;
  c.innerHTML='<div></div><button type="button" class="mv">Move</button>';c.firstChild.textContent=(t&&!slotsList().includes(hm(t))?hm(t)+' · ':'')+(p.title||'');
  c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',id)});c.querySelector('.mv').onclick=e=>{e.stopPropagation();slotPicker(id)};c.addEventListener('dblclick',()=>openPost(id));c.title='Double-click to open';return c}
function calClip(id,cl,t){const c=document.createElement('div');c.className='cpost clip'+(cl.status==='sent'?' done':'');c.draggable=cl.status!=='scheduled'&&cl.status!=='sent';
  c.innerHTML='<div></div><button type="button" class="mv">Open</button>';c.firstChild.textContent='🎬 '+(t&&!slotsList().includes(hm(t))?hm(t)+' · ':'')+(cl.hook||cl.title||'Clip')+(cl.status==='scheduled'?' ✓':'');
  c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain','clip:'+id)});c.querySelector('.mv').onclick=e=>{e.stopPropagation();openClip(id)};c.addEventListener('dblclick',()=>openClip(id));c.title=cl.status==='scheduled'?'Scheduled on OpusClip':'Clip: drag to move';return c}
function renderCal(){const cal=$('#cal');if(!cal)return;const ws=weekStart(calOffset);const we=new Date(ws);we.setDate(we.getDate()+6);
  $('#cal-range').textContent=ws.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' – '+we.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  cal.innerHTML='';const items=order.map(i=>({id:i,p:posts[i],t:postTime(posts[i])}));const today=ymd(new Date());
  for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(d.getDate()+i);const key=ymd(d);const col=document.createElement('div');col.className='cday'+(key===today?' today':'');col.innerHTML='<h4></h4>';col.querySelector('h4').textContent=dlabel(d);
    const dayItems=items.filter(x=>x.t&&ymd(x.t)===key);const dayClips=clipsOnCal().filter(x=>ymd(x.t)===key);
    const rows=[...slotsList()];[...dayItems,...dayClips].forEach(x=>{const k=hm(x.t);if(!rows.includes(k))rows.push(k)});rows.sort();
    rows.forEach(t=>{const s=document.createElement('div');s.className='cslot';s.innerHTML='<span>'+t+'</span>';dayItems.filter(x=>hm(x.t)===t).forEach(x=>s.appendChild(calCard(x.id,x.p,x.t)));dayClips.filter(x=>hm(x.t)===t).forEach(x=>s.appendChild(calClip(x.id,x.c,x.t)));
      if(!s.querySelector('.cpost')&&!slotsList().includes(t))return;
      s.addEventListener('dragover',e=>{e.preventDefault();s.classList.add('over')});s.addEventListener('dragleave',()=>s.classList.remove('over'));
      s.addEventListener('drop',e=>{e.preventDefault();s.classList.remove('over');const id=e.dataTransfer.getData('text/plain');if(id&&id.startsWith('clip:'))moveClip(id.slice(5),d,t);else if(id)movePost(id,d,t)});col.appendChild(s)});
    cal.appendChild(col)}
  const un=$('#cal-unsched');un.innerHTML='';items.filter(x=>!x.t&&x.p.status!=='posted').forEach(x=>un.appendChild(calCard(x.id,x.p,null)));if(!un.children.length)un.innerHTML='<p class="hempty">Everything has a slot.</p>'}
$('#cal-prev').onclick=()=>{calOffset--;renderCal()};$('#cal-next').onclick=()=>{calOffset++;renderCal()};$('#cal-today').onclick=()=>{calOffset=0;renderCal()};

// ---------- Photo library ----------
const libThumb=new Map();
function libItems(q){q=String(q||'').toLowerCase().trim();const all=Object.values(photoLib).sort((a,b)=>String(b.at).localeCompare(String(a.at)));if(!q)return all;const words=q.split(/\s+/);
  const hit=all.filter(x=>words.some(w=>w.length>2&&(String(x.name)+' '+String(x.who)).toLowerCase().includes(w)));return hit}
function libCard(x,onPick){const d=document.createElement('div');d.className='libitem'+(onPick?' pick':'');d.innerHTML='<img alt=""><div class="li"><b></b><span class="msg"></span></div>';
  d.querySelector('b').textContent=x.name||'Photo';d.querySelector('.msg').textContent=x.who||(x.at?new Date(x.at).toLocaleDateString('en-GB'):'');
  const img=d.querySelector('img');img.alt=x.name||'';if(libThumb.has(x.file))img.src=libThumb.get(x.file);else fetch('/_blob/'+x.file).then(r=>r.ok?r.blob():null).then(b=>{if(b){const u=URL.createObjectURL(b);libThumb.set(x.file,u);img.src=u}}).catch(()=>{});
  if(onPick){d.tabIndex=0;d.onclick=()=>onPick(x);d.onkeydown=e=>{if(e.key==='Enter')onPick(x)}}return d}
function renderLib(){const g=$('#lib');if(!g)return;const items=libItems($('#lib-q').value);g.innerHTML='';items.slice(0,200).forEach(x=>g.appendChild(libCard(x)));
  $('#lib-msg').textContent=Object.keys(photoLib).length?items.length+' photo'+(items.length===1?'':'s'):'';if(!items.length)g.innerHTML='<p class="hempty">'+(Object.keys(photoLib).length?'No photos match that.':'Every photo you add to a post is saved here, so you only find each face once.')+'</p>'}
$('#lib-q').addEventListener('input',renderLib);
function openLibraryPicker(term,cb){const m=document.createElement('div');m.className='modal';const box=document.createElement('div');box.style.cssText='background:#fff;padding:16px;border-radius:10px;max-width:760px;width:100%;max-height:86vh;overflow:auto;display:grid;gap:10px';
  box.innerHTML='<div class="row"><input type="text" aria-label="Search photos" style="flex:1"><button type="button" class="ghost sm">Close</button></div><div class="libgrid" style="margin:0"></div>';
  const q=box.querySelector('input'),g=box.querySelector('.libgrid');q.value=term||'';
  const draw=()=>{let items=libItems(q.value);g.innerHTML='';if(!items.length){items=libItems('');if(q.value)g.insertAdjacentHTML('beforeend','<p class="hempty" style="grid-column:1/-1">No saved photo matches “'+esc(q.value)+'”. All your photos:</p>')}
    items.slice(0,120).forEach(x=>g.appendChild(libCard(x,it=>{m.remove();cb(it)})));if(!items.length)g.innerHTML='<p class="hempty">Your library is empty. Photos you add to posts are saved here.</p>'};
  q.oninput=draw;box.querySelector('button').onclick=()=>m.remove();m.appendChild(box);m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m);draw()}

// ---------- Tables & fixtures ----------
document.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>{tableComp=b.dataset.tc;document.querySelectorAll('[data-tc]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTables()});
function curTable(){const t=tablesData[tableComp];return t&&t.groups&&t.groups[0]?t.groups[0].table:[]}
function renderTables(){const tb=$('#t-table');if(!tb)return;const rows=curTable();const t=tablesData[tableComp];
  tb.innerHTML='<thead><tr><th>#</th><th>Team</th><th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GD</th><th class="n">Pts</th><th>Form</th></tr></thead><tbody>'+
    (rows.length?rows.map(r=>`<tr class="${teamsList().some(x=>(r.team.name+' '+r.team.short).toLowerCase().includes(x.toLowerCase()))?'hl':''}"><td>${r.position}</td><td>${r.team.crest?`<img src="${esc(r.team.crest)}" alt="">`:''}${esc(r.team.short)}</td><td class="n">${r.playedGames}</td><td class="n">${r.won}</td><td class="n">${r.draw}</td><td class="n">${r.lost}</td><td class="n">${r.goalDifference>0?'+':''}${r.goalDifference}</td><td class="n"><b>${r.points}</b></td><td>${esc(String(r.form||'').replace(/,/g,''))}</td></tr>`).join(''):'<tr><td colspan="9" class="msg">'+(metaDocs.system&&metaDocs.system.football?'Waiting for the first update (within a few minutes).':'Live football data isn’t connected yet (setup guide, step 8).')+'</td></tr>')+'</tbody>';
  $('#t-upd').textContent=t&&t.updatedAt?'Updated '+ago(t.updatedAt)+'.':'';renderTableFx();
  const sc=(scorersData[tableComp]&&scorersData[tableComp].scorers)||[];
  $('#t-scorers').innerHTML='<thead><tr><th>Player</th><th>Team</th><th class="n">Goals</th><th class="n">Assists</th></tr></thead><tbody>'+(sc.length?sc.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.team.short)}</td><td class="n"><b>${s.goals}</b></td><td class="n">${s.assists??'–'}</td></tr>`).join(''):'<tr><td colspan="4" class="msg">No data yet.</td></tr>')+'</tbody>'}
let tfxMode='up';
document.querySelectorAll('[data-tf]').forEach(b=>b.onclick=()=>{tfxMode=b.dataset.tf;document.querySelectorAll('[data-tf]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#t-card-fx').textContent=tfxMode==='up'?'Fixtures card':'Results card';renderTableFx()});
function tfxList(){const all=Object.values(matches).filter(m=>m.comp===tableComp);
  return tfxMode==='up'?all.filter(m=>['TIMED','SCHEDULED','IN_PLAY','PAUSED'].includes(m.status)).sort((a,b)=>a.utcDate.localeCompare(b.utcDate)).slice(0,20)
    :all.filter(m=>m.status==='FINISHED').sort((a,b)=>b.utcDate.localeCompare(a.utcDate)).slice(0,20)}
function renderTableFx(){const box=$('#t-fx');if(!box)return;box.innerHTML='';const list=tfxList();const today=ymd(new Date());
  list.forEach(m=>{const d=new Date(m.utcDate);const lv=liveNow(m);
    box.appendChild(hItem(m.status==='FINISHED'||lv?`${m.hs}-${m.as}`:hm(d),m.home.short+' v '+m.away.short,(ymd(d)===today?'Today':dlabel(d))+(m.matchday?' · Matchday '+m.matchday:''),lv?{t:m.status==='PAUSED'?'HT':'LIVE',cls:'live'}:m.status==='FINISHED'?{t:'FT'}:(isWatched(m)?{t:'★'}:null),()=>{mFilter=m.status==='FINISHED'?'results':(ymd(d)===today?'today':'week');showTab('match')}))});
  if(!list.length)box.innerHTML='<p class="hempty">'+(Object.keys(matches).length?'No '+(tfxMode==='up'?'upcoming games':'recent results')+' for this competition in the next/last two weeks.':'Fixtures load within a few minutes of connecting live data.')+'</p>'}
$('#t-card-fx').onclick=async()=>{const m=$('#t-msg');const list=tfxList().slice(0,6);if(!list.length){m.textContent='Nothing to put on a card yet.';return}const cn=COMP_NAMES[tableComp]||tableComp;const up=tfxMode==='up';
  await createPost({title:`${cn} ${up?'fixtures':'results'}`,format:up?'Predictor':'Results round-up',why:up?'Fans predict every game and argue about the big ones.':'Everyone checks the scores and has a view on the shock result.',template:'list',theme:'brand',
    fields:{tag:U(cn)+(list[0].matchday?' · MATCHDAY '+list[0].matchday:''),title:up?'Fixtures':'Results',items:list.map(x=>up?`${x.home.tla||x.home.short} v ${x.away.tla||x.away.short}`:`${x.home.tla||x.home.short} ${x.hs}-${x.as} ${x.away.tla||x.away.short}`),body:up?'Predict them all in the comments':'Full-time scores',question:up?'Predict the scores 👇':'Result of the weekend?'},
    caption:`${cn} ${up?'fixtures':'results'} ${up?'📅':'⚽'}\n\n${list.map(x=>up?`${x.home.short} v ${x.away.short} (${dlabel(new Date(x.utcDate))} ${hm(new Date(x.utcDate))})`:`${x.home.short} ${x.hs}-${x.as} ${x.away.short}`).join('\n')}\n\n${up?'Predict the scores 👇':'Result of the weekend? 👇'}`,
    photoSearch:{term:list[0].home.short+' '+list[0].away.short,tip:'A player from the biggest game.'}},m)};
async function tableCard(which){const rows=curTable();const m=$('#t-msg');if(!rows.length){m.textContent='No table yet.';return}const cn=COMP_NAMES[tableComp]||tableComp;const md=tablesData[tableComp]&&tablesData[tableComp].matchday;
  const pick=which==='top'?rows.slice(0,5):rows.slice(-5);const n=rows.length;
  await createPost({title:`${cn} ${which==='top'?'top 5':'bottom 5'}`,format:'Table card',why:which==='top'?'Title-race talk: every fan base has an opinion on who finishes top.':'Relegation fear gets every fan of those clubs commenting.',template:'ranking',theme:'brand',
    fields:{tag:U(cn)+(md?' · MATCHDAY '+md:''),title1:which==='top'?'The top':'The bottom',title2:which==='top'?'five':'five',rows:pick.map(r=>({name:`${r.position}. ${r.team.short} · ${r.points} pts`,hi:(which==='top'?r.position===1:r.position>n-3)?'hi':''})),body:'',question:which==='top'?'Who wins the league?':'Who goes down?'},
    caption:`The ${cn} ${which==='top'?'top five':'bottom five'}${md?' after matchday '+md:''} 👀\n\n${pick.map(r=>`${r.position}. ${r.team.short} ${r.points} pts`).join('\n')}\n\n${which==='top'?'Who wins the league?':'Who goes down?'} 👇`,
    photoSearch:{term:(which==='top'?pick[0]:pick[pick.length-1]).team.short+' players',tip:'A team or player shot from that club.'}},m)}
$('#t-card-top').onclick=()=>tableCard('top');$('#t-card-bottom').onclick=()=>tableCard('bottom');
$('#t-card-scorers').onclick=async()=>{const sc=(scorersData[tableComp]&&scorersData[tableComp].scorers)||[];const m=$('#t-msg');if(!sc.length){m.textContent='No scorers yet.';return}const cn=COMP_NAMES[tableComp]||tableComp;const top=sc.slice(0,6);
  await createPost({title:`${cn} top scorers`,format:'Stat shock',why:'Fans argue about who ends up with the Golden Boot.',template:'list',theme:'brand',
    fields:{tag:U(cn)+' · TOP SCORERS',title:'Top scorers',items:top.map(s=>`${s.name.split(' ').slice(-1)[0]} ${s.goals}`),body:'Goals so far this season',question:'Who finishes top scorer?'},
    caption:`${cn} top scorers so far ⚽\n\n${top.map((s,i)=>`${i+1}. ${s.name} (${s.team.short}) ${s.goals}`).join('\n')}\n\nWho finishes top scorer? 👇`,photoSearch:{term:top[0].name+' '+top[0].team.short,tip:'Close-up, celebrating if possible.'}},m)};

// ---------- Match Centre (live) ----------
document.querySelectorAll('[data-mf]').forEach(b=>b.onclick=()=>{mFilter=b.dataset.mf;document.querySelectorAll('[data-mf]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLive()});
function makeGoalCard(m,side,scorer,minute,msgEl){const team=side==='home'?m.home.short:m.away.short;
  return createPost({batchLabel:'Live · '+m.home.short+' v '+m.away.short,title:`GOAL: ${scorer||team} ${minute?minute+"'":''} (${m.home.short} ${m.hs}-${m.as} ${m.away.short})`,format:'Goal!',why:'Speed wins: first with the goal gets the shares.',template:'goal',theme:'brand',
    fields:{tag:U(m.compName||COMP_NAMES[m.comp]||'GOAL'),scorer:scorer||team,minute:minute||'',home:m.home.short,away:m.away.short,hs:m.hs,as:m.as,question:'Who scores next?'},
    caption:`GOAL! ⚽ ${scorer||team}${minute?' '+minute+"'":''}\n\n${m.home.short} ${m.hs}-${m.as} ${m.away.short}\n\nWho scores next? 👇`,photoSearch:{term:(scorer?scorer+' ':'')+team+' celebration',tip:'A celebration shot. Optional: the card works without a photo.'}},msgEl)}
function makeResultCard(m,label,msgEl){const sc=side=>(m.goals||[]).filter(g=>g.side===side&&g.scorer).map(g=>g.scorer+' '+g.minute+'′');const ht=label==='HALF-TIME';
  const hs=ht&&m.status!=='PAUSED'&&m.hths!=null?m.hths:m.hs,as=ht&&m.status!=='PAUSED'&&m.htas!=null?m.htas:m.as;const q=ht?'What changes at half-time?':'Who was your man of the match?';
  return createPost({batchLabel:'Live · '+m.home.short+' v '+m.away.short,title:`${ht?'HT':'FT'}: ${m.home.short} ${hs}-${as} ${m.away.short}`,format:ht?'Half-time':'Full-time result',why:'Fast score cards get shared on match day.',template:'result',theme:'brand',
    fields:{tag:U(m.compName||COMP_NAMES[m.comp]||label),label,home:m.home.short,away:m.away.short,hs,as,homeScorers:sc('home'),awayScorers:sc('away'),question:q},
    caption:`${ht?'HT':'FT'}: ${m.home.short} ${hs}-${as} ${m.away.short}\n\n${q} 👇`,photoSearch:{term:(hs>=as?m.home.short:m.away.short)+' players',tip:'Optional: the card works without a photo.'}},msgEl||$('#m-msg'))}
function makePredictor(m,msgEl){const d=new Date(m.utcDate);return createPost({title:`Predict: ${m.home.short} v ${m.away.short}`,format:'Predictor',why:'Everyone has a score in mind, and they come back to see if they were right.',template:'versus',theme:'brand',
  fields:{tag:U(m.compName||COMP_NAMES[m.comp]||''),title1:'Predict',title2:'the score',home:m.home.short,homeSub:'',away:m.away.short,awaySub:'',info:dlabel(d)+' · '+hm(d)+(m.venue?' · '+m.venue:''),question:'Predict the score 👇'},
  caption:`${m.home.short} v ${m.away.short}, ${dlabel(d)} ${hm(d)} kick-off.\n\nPredict the score 👇`,photoSearch:{term:m.home.short+' '+m.away.short,tip:'A player from each side, or the two managers.'}},msgEl)}
function renderLive(){const box=$('#mlive');if(!box)return;const today=ymd(new Date());const all=Object.values(matches);let list;
  const d0=new Date();d0.setHours(0,0,0,0);const day=n=>{const d=new Date(d0);d.setDate(d.getDate()+n);return ymd(d)};
  if(mFilter==='today')list=all.filter(m=>liveNow(m)||ymd(new Date(m.utcDate))===today);
  else if(mFilter==='week')list=all.filter(m=>{const k=ymd(new Date(m.utcDate));return k>=today&&k<day(7)});
  else if(mFilter==='next')list=all.filter(m=>{const k=ymd(new Date(m.utcDate));return k>=day(7)&&k<day(14)});
  else list=all.filter(m=>m.status==='FINISHED').sort((a,b)=>b.utcDate.localeCompare(a.utcDate)).slice(0,60);
  if(mFilter!=='results')list.sort((a,b)=>(liveNow(b)-liveNow(a))||a.utcDate.localeCompare(b.utcDate)||(isWatched(b)-isWatched(a)));
  box.innerHTML='';
  if(!all.length){box.innerHTML=`<p class="hempty">${metaDocs.system&&metaDocs.system.football?'Loading fixtures… (the first update takes a couple of minutes)':'Live football data isn’t connected yet. Add your football-data.org key (setup guide, step 8) and fixtures, scores, tables and goal alerts switch on by themselves.'}</p>`;return}
  if(!list.length){box.innerHTML='<p class="hempty">No games here.</p>';return}
  let last=null;
  for(const m of list){const d=new Date(m.utcDate);const k=liveNow(m)?'live':ymd(d);if(k!==last&&mFilter!=='today'){const h=document.createElement('div');h.className='mdate';h.textContent=liveNow(m)?'Live now':(k===today?'Today':dlabel(d));box.appendChild(h);last=k}
    const c=document.createElement('article');c.className='mcard'+(liveNow(m)?' live':'')+(m.status==='FINISHED'?' done':'');c.id='mc-'+m.id;
    const sc=m.hs==null?'v':`${m.hs}–${m.as}`;
    c.innerHTML=`<div class="mstatus"><span>${esc(COMP_NAMES[m.comp]||m.compName||'')}${isWatched(m)?' · ★ watched':''}</span><span>${mStatus(m)}</span></div>
      <div class="mteams"><div class="tm">${m.home.crest?`<img src="${esc(m.home.crest)}" alt="">`:''}<span>${esc(m.home.short)}</span></div><div class="sc">${sc}</div><div class="tm">${m.away.crest?`<img src="${esc(m.away.crest)}" alt="">`:''}<span>${esc(m.away.short)}</span></div></div>
      ${(m.goals||[]).length?`<div class="goals">⚽ ${(m.goals||[]).map(g=>esc(g.scorer||'?')+' '+esc(g.minute)+'′ ('+esc(g.side==='home'?m.home.short:m.away.short)+')').join(', ')}</div>`:''}
      <div class="row acts"></div><div class="gform" hidden></div><div class="msg mm"></div>`;
    const acts=c.querySelector('.acts'),mm=c.querySelector('.mm');const btn=(t,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=t;b.onclick=fn;acts.appendChild(b)};
    if(liveNow(m)||m.status==='FINISHED'){btn('⚽ GOAL card','gbtn',()=>openGoal(c,m));btn('Half-time card','ghost',()=>makeResultCard(m,'HALF-TIME',mm));btn('Full-time card','ghost',()=>makeResultCard(m,'FULL TIME',mm))}
    else if(['TIMED','SCHEDULED'].includes(m.status))btn('Predictor post','ghost',()=>makePredictor(m,mm));
    box.appendChild(c);if(goalOpen===String(m.id)){openGoal(c,m);goalOpen=null}}}
function openGoal(c,m){const f=c.querySelector('.gform');f.hidden=false;const lg=m.lastGoal||{};let side=lg.side||'home';
  f.innerHTML=`<div class="goalrow"><div class="side" role="group" aria-label="Which team scored"><button class="ghost" data-s="home" type="button"></button><button class="ghost" data-s="away" type="button"></button></div>
    <input type="text" class="gs" placeholder="Scorer" aria-label="Scorer"><input type="text" class="gm" placeholder="Min" inputmode="numeric" aria-label="Minute"><button class="gbtn gmk" type="button">Make GOAL card</button></div>`;
  const [bh,ba]=f.querySelectorAll('[data-s]');bh.textContent=m.home.short;ba.textContent=m.away.short;const setS=s=>{side=s;bh.setAttribute('aria-pressed',String(s==='home'));ba.setAttribute('aria-pressed',String(s==='away'))};setS(side);bh.onclick=()=>setS('home');ba.onclick=()=>setS('away');
  f.querySelector('.gs').value=lg.scorer||'';f.querySelector('.gm').value=lg.minute||m.minute||'';f.querySelector('.gmk').onclick=()=>makeGoalCard(m,side,f.querySelector('.gs').value.trim(),f.querySelector('.gm').value.trim(),c.querySelector('.mm'));
  setTimeout(()=>{(lg.scorer?f.querySelector('.gmk'):f.querySelector('.gs')).focus()},50)}

// ---------- Settings ----------
function renderSettings(){const v=$('#view-settings');if(!v)return;
  $('#st-teams').value=teamsList().join('\n');$('#st-slots').value=slotsList().join(', ');
  const cs=compsList();$('#st-comps').innerHTML=Object.entries(COMP_NAMES).map(([k,n])=>`<label><input type="checkbox" data-comp="${k}" ${cs.includes(k)?'checked':''}> ${n}</label>`).join('');
  const a={goals:true,ht:true,ft:true,reminders:true,...(settings.alerts||{})},au={pred:true,res:true,rat:true,...(settings.auto||{})};
  $('#st-a-goals').checked=a.goals;$('#st-a-ht').checked=a.ht;$('#st-a-ft').checked=a.ft;$('#st-a-rem').checked=a.reminders;$('#st-auto-pred').checked=au.pred;$('#st-auto-res').checked=au.res;$('#st-auto-rat').checked=au.rat;
  const sy=metaDocs.system||{};const cu=monthUsage('usage'),hu=monthUsage('hfusage');const cap=(window.PB&&PB.config&&PB.config.budgetGbp)||10,hcap=(window.PB&&PB.config&&PB.config.hfBudgetGbp)||5;
  const row=(n,ok,extra)=>`<div class="conn"><span>${n}</span><span class="${ok?'ok':'no'}">${ok?'Connected':'Not connected'}${extra?' · '+extra:''}</span></div>`;
  $('#st-conn').innerHTML=row('Claude (writing)',sy.claude!==false,gbp(cu.usd)+' of £'+cap)+row('Live football data',!!sy.football)+row('Higgsfield (Kling video)',!!sy.higgsfield,gbp(hu.usd)+' of £'+hcap)+row('OpusClip (clips)',!!sy.opus)+row('Phone alerts',!!sy.push)+row('Scan now button',!!sy.scan)+
    `<p class="msg">${sy.lastTick?'Background checks last ran '+ago(sy.lastTick)+'.':'Background checks haven’t run yet.'}</p>`;
  pushStatus()}
async function pushStatus(){const m=$('#st-pushmsg'),b=$('#st-push');if(!(window.PB&&PB.push)){m.textContent='Phone alerts work in the installed app.';b.disabled=true;return}
  if(PB.push.standaloneNeeded()){m.textContent='On iPhone, alerts work once the Studio is on your home screen: Share → Add to Home Screen, then open it from there.';return}
  if(!PB.push.supported()){m.textContent='This browser can’t show alerts.';b.disabled=true;return}
  const s=await PB.push.state().catch(()=>'off');b.textContent=s==='on'?'Alerts are on for this device ✓':'Turn on alerts on this device';if(s==='denied')m.textContent='Alerts are blocked for this site. Allow notifications in your browser or phone settings.'}
$('#st-push').onclick=async()=>{const m=$('#st-pushmsg');try{await PB.push.subscribe();m.textContent='Done. You’ll get goal alerts and posting reminders on this device.';pushStatus()}catch(e){m.textContent=e.message}};
$('#st-test').onclick=async()=>{const m=$('#st-pushmsg');m.textContent='Sending in 15 seconds: lock your phone now (iPhone doesn’t show alerts while the app is open).';try{const r=await PB.push.test(15000);m.textContent=r&&r.sent?'Test sent to '+r.sent+' device'+(r.sent>1?'s':'')+'.':'No devices have alerts turned on yet.'}catch(e){m.textContent=e.message}};
$('#st-save').onclick=async()=>{const m=$('#st-msg');const patch={watchTeams:$('#st-teams').value.split('\n').map(s=>s.trim()).filter(Boolean),alertComps:[...document.querySelectorAll('[data-comp]')].filter(x=>x.checked).map(x=>x.dataset.comp),
    alerts:{goals:$('#st-a-goals').checked,ht:$('#st-a-ht').checked,ft:$('#st-a-ft').checked,reminders:$('#st-a-rem').checked},auto:{pred:$('#st-auto-pred').checked,res:$('#st-auto-res').checked,rat:$('#st-auto-rat').checked},
    slots:$('#st-slots').value.split(/[,\s]+/).map(s=>s.trim()).filter(s=>/^\d{1,2}:\d{2}$/.test(s)).map(s=>s.padStart(5,'0')).sort()};
  if(!patch.slots.length)patch.slots=DEF_SLOTS;settings={...settings,...patch};if(!db){m.textContent='Can’t save in this view.';return}
  try{await db.doc('meta/settings').update(patch);m.textContent='Saved.'}catch(e){try{await db.doc('meta/settings').set({...settings});m.textContent='Saved.'}catch(e2){m.textContent='Could not save ('+(e2.code||'error')+').'}}};
$('#st-signout').onclick=()=>{if(window.PB&&PB.signOut)PB.signOut()};
setInterval(()=>{if(curTab==='home'||curTab==='match')studioShow(curTab,true)},60000);

