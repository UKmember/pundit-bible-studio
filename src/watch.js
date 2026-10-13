
// ================= Watched accounts (on the Breaking news page) =================
const WT_DEFAULT=[{platform:'instagram',username:'fabriziorom',name:'Fabrizio Romano',on:true},{platform:'instagram',username:'talksport',name:'talkSPORT',on:true},{platform:'instagram',username:'sportsjoedotie',name:'SportsJOE',on:true},{platform:'x',username:'David_Ornstein',name:'David Ornstein',on:true}];
const wtAccounts=()=>Array.isArray(settings.watch)?settings.watch:WT_DEFAULT;
const wtKey=a=>a.platform+'-'+String(a.username).toLowerCase();
async function wtSave(patch,msg){settings={...settings,...patch};if(!db)return;try{await db.doc('meta/settings').update(patch)}catch(e){try{await db.doc('meta/settings').set({...settings})}catch(e2){}}if(msg)$('#wt-msg').textContent=msg}
function renderWatch(){const feed=$('#wt-feed');if(!feed)return;$('#wt-min').value=String(settings.watchMin||7);
  const items=Object.entries(watchItems).map(([id,w])=>({id,...w})).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,25);feed.innerHTML='';
  items.forEach(w=>{const r=document.createElement('div');r.className='witem'+(w.status==='skipped'?' dim':'');const d=new Date(w.at);
    r.innerHTML='<span class="t"></span><div><b></b><small></small></div><div class="row"></div>';
    r.querySelector('.t').textContent=ymd(d)===ymd(new Date())?hm(d):d.toLocaleDateString('en-GB',{weekday:'short'});
    r.querySelector('b').textContent=(w.platform==='x'?'𝕏 ':'IG ')+(w.name||w.username)+': '+(w.story||String(w.text||'').split('\n')[0].slice(0,110));
    r.querySelector('small').textContent=(w.status==='drafted'?'✓ Your post is drafted':w.status==='skipped'?'Not drafted (score '+(w.score||0)+'/10)':w.status==='new'?'Checking…':'')+(w.likes!=null?' · their post: '+Number(w.likes).toLocaleString('en-GB')+' likes':'')+(w.error?' · '+w.error:'');
    const acts=r.querySelector('.row');const btn=(t,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=t;b.onclick=fn;acts.appendChild(b);return b};
    if(w.status==='drafted'&&w.post)btn('Open post','sm',()=>openPost(w.post));
    else{const b=btn('Make our version','ghost sm',async()=>{b.disabled=true;b.textContent='Writing…';try{const r2=await PB.watch.draft(w.id);openPost(r2.post)}catch(e){b.textContent=e.message.slice(0,40);b.disabled=false}})}
    btn('Original','ghost sm',()=>window.open(w.link,'_blank','noopener'));feed.appendChild(r)});
  if(!items.length)feed.innerHTML='<p class="hempty">Nothing yet. The first check just notes what each account has already posted; new posts show here from then on.</p>';
  const st=metaDocs.watchstate||{},xu=metaDocs.xusage||{};const box=$('#wt-accts');box.innerHTML='';
  wtAccounts().forEach((a,i)=>{const s=st[wtKey(a)]||{};const r=document.createElement('label');r.className='wacct';r.innerHTML='<input type="checkbox"><span><b></b> <small></small></span><button type="button" class="ghost sm">Remove</button>';
    r.querySelector('input').checked=!!a.on;r.querySelector('b').textContent=(a.platform==='x'?'X':'Instagram')+' · '+(a.name||a.username);
    r.querySelector('small').textContent='@'+a.username+(s.error?' · ⚠ '+s.error:s.note?' · '+s.note:s.checked?' · checked '+ago(new Date(s.checked).toISOString()):'');
    r.querySelector('input').onchange=e=>{const list=wtAccounts().map((x,j)=>j===i?{...x,on:e.target.checked}:x);wtSave({watch:list},'Saved.')};
    r.querySelector('button').onclick=e=>{e.preventDefault();const list=wtAccounts().filter((x,j)=>j!==i);wtSave({watch:list},'Removed.');renderWatch()};box.appendChild(r)});
  const mo=ymd(new Date()).slice(0,7);const xs=xu.month===mo?Number(xu.usd||0):0;box.insertAdjacentHTML('beforeend','<p class="msg">X reading this month: $'+xs.toFixed(2)+' of $'+(settings.xReadCapUsd||3)+'.</p>')}
$('#wt-min').onchange=e=>wtSave({watchMin:Number(e.target.value)},'Saved.');
$('#wt-now').onclick=async()=>{const b=$('#wt-now');if(!(window.PB&&PB.watch))return;b.disabled=true;b.textContent='Checking…';try{const r=await PB.watch.poll();$('#wt-msg').textContent=(r.log||[]).join(' · ')||'Nothing new.'}catch(e){$('#wt-msg').textContent=e.message}b.disabled=false;b.textContent='Check now'};
$('#wt-add').addEventListener('submit',e=>{e.preventDefault();const u=$('#wt-user').value.trim().replace(/^@/,'').replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com)\//,'').split(/[/?]/)[0];if(!u)return;
  const a={platform:$('#wt-plat').value,username:u,name:$('#wt-name').value.trim()||u,on:true};if(wtAccounts().some(x=>wtKey(x)===wtKey(a))){$('#wt-msg').textContent='Already watching that one.';return}
  wtSave({watch:[...wtAccounts(),a]},'Added. The first check notes their existing posts; new ones show here from then on.');e.target.reset();renderWatch()});
