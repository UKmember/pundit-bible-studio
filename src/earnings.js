
// ================= Earnings: YouTube + Facebook, in pounds =================
let erRange=30,erTable=false;
const gbpFmt=n=>'£'+(Number(n)||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const usdFmt=n=>'$'+(Number(n)||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const dayGbp=d=>((d&&d.yt&&d.yt.gbp)||0)+((d&&d.fb&&d.fb.gbp)||0);
function sumRange(from,to){let yt=0,fb=0,usd=0;for(const [k,d] of Object.entries(earnDays)){if(k<from||k>to)continue;yt+=(d.yt&&d.yt.gbp)||0;fb+=(d.fb&&d.fb.gbp)||0;usd+=(d.fb&&d.fb.cur!=='GBP'&&d.fb.amt)||0}return {yt,fb,usd,all:yt+fb}}
function monthBounds(off){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+off);const a=ymd(d);const e=new Date(d);e.setMonth(e.getMonth()+1);e.setDate(0);return [a,ymd(e),e.getDate()]}
function earnConnected(){const y=metaDocs.earn_yt||{},f=metaDocs.earn_fb||{};return {yt:!!y.connected,fb:!!f.connected}}
function earnMonthTotal(){const c=earnConnected();if(!c.yt&&!c.fb)return {txt:'–',sub:'Connect YouTube and Facebook'};const [a,b]=monthBounds(0);const s=sumRange(a,b);return {txt:gbpFmt(s.all),sub:'YouTube '+gbpFmt(s.yt)+' · Facebook '+gbpFmt(s.fb)}}
// projection: average of the last 7 days that have figures, for the days left this month
function projection(){const [a,b,n]=monthBounds(0);const so=sumRange(a,b).all;const today=ymd(new Date());
  const ks=Object.keys(earnDays).filter(k=>k<today&&dayGbp(earnDays[k])>0).sort().slice(-7);if(!ks.length)return null;
  const avg=ks.reduce((t,k)=>t+dayGbp(earnDays[k]),0)/ks.length;const last=ks[ks.length-1];
  const counted=last>=a?Number(last.slice(8,10)):0; // YouTube runs a few days behind, so project from the last day that has figures
  return so+avg*Math.max(0,n-counted)}

function renderEarnings(){const k=$('#er-kpis');if(!k)return;const c=earnConnected();const y=metaDocs.earn_yt||{},f=metaDocs.earn_fb||{};
  const [ma,mb]=monthBounds(0),[la,lb]=monthBounds(-1);const m=sumRange(ma,mb),l=sumRange(la,lb);const d7=new Date();d7.setDate(d7.getDate()-7);const w=sumRange(ymd(d7),ymd(new Date()));const pr=projection();
  const split=s=>`YouTube ${gbpFmt(s.yt)} · Facebook ${gbpFmt(s.fb)}`;
  k.innerHTML=[['This month',gbpFmt(m.all),split(m)],['Projected this month',pr==null?'–':gbpFmt(pr),'at the last 7 days’ pace'],['Last 7 days',gbpFmt(w.all),split(w)],['Last month',gbpFmt(l.all),split(l)]]
    .map(([lab,v,s])=>`<div class="kpi"><b>${esc(v)}</b><span>${esc(lab)}</span><small class="split">${esc(s)}</small></div>`).join('');
  const sy=[y.syncedAt,f.syncedAt].filter(Boolean).sort().pop();$('#er-sync').textContent=sy?'Updated '+ago(sy)+(f.rateToday?' · $1 = £'+f.rateToday:''):'';
  drawEarnChart();drawEarnTable();
  const top=(box,list,isFb)=>{const el=$(box);el.innerHTML='';(list||[]).slice(0,8).forEach(t=>{const b=hItem(gbpFmt(t.gbp),t.title||'',isFb?(t.cur&&t.cur!=='GBP'?usdFmt(t.amt)+' · ':'')+(t.at?new Date(t.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''):Number(t.views||0).toLocaleString('en-GB')+' views',null,()=>{if(t.url)window.open(t.url,'_blank','noopener')});b.querySelector('.t').style.fontSize='17px';el.appendChild(b)});
    if(!el.children.length)el.innerHTML='<p class="hempty">'+((isFb?c.fb:c.yt)?'Nothing yet.':'Not connected yet.')+'</p>'};
  top('#er-topyt',y.top,false);top('#er-topfb',f.top,true);
  // connections
  const cn=$('#er-conn');cn.innerHTML='';
  const row=(name,col,on,sub,err,prov,extra)=>{const r=document.createElement('div');r.className='econn';r.innerHTML=`<span class="dot" style="background:${col}"></span><div><b></b><small></small>${err?'<small style="color:var(--red)"></small>':''}</div><div class="row"></div>`;
    r.querySelector('b').textContent=name;r.querySelectorAll('small')[0].textContent=sub;if(err)r.querySelectorAll('small')[1].textContent=err;const acts=r.querySelector('.row');
    const b=document.createElement('button');b.type='button';b.className=on?'ghost sm':'sm';b.textContent=on?'Reconnect':'Connect '+name;b.onclick=async()=>{b.disabled=true;b.textContent='Opening…';try{await PB.earnings.connect(prov)}catch(e){erMsg(e.message);b.disabled=false;b.textContent='Connect '+name}};acts.appendChild(b);
    if(extra)acts.prepend(extra);cn.appendChild(r)};
  row('YouTube','var(--yt)',c.yt,c.yt?('Channel: '+(y.channel||'connected')+(y.lastDay?' · figures up to '+new Date(y.lastDay).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'')):'Shows YouTube’s estimated revenue, in pounds.',y.error,'google');
  let pagePick=null;if(c.fb&&Array.isArray(f.pages)&&f.pages.length>1){pagePick=document.createElement('select');pagePick.style.width='auto';pagePick.setAttribute('aria-label','Facebook page');f.pages.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;pagePick.appendChild(o)});pagePick.value=f.pageId||'';
    pagePick.onchange=async()=>{erMsg('Switching page and fetching its figures…');try{await PB.earnings.page(pagePick.value);erMsg('Switched.')}catch(e){erMsg(e.message)}}}
  row('Facebook','var(--fb)',c.fb,c.fb?('Page: '+(f.page||'connected')):'Shows your Content Monetization earnings, converted from dollars.',f.error,'meta',pagePick)}
function erMsg(t){const m=$('#er-msg');m.hidden=!t;m.textContent=t||''}

function erDays(){const out=[];const d=new Date();d.setDate(d.getDate()-erRange+1);for(let i=0;i<erRange;i++){const k=ymd(d);const x=earnDays[k]||{};out.push({k,d:new Date(d),yt:(x.yt&&x.yt.gbp)||0,fb:(x.fb&&x.fb.gbp)||0,usd:x.fb&&x.fb.cur!=='GBP'?x.fb.amt:null,rate:x.fb&&x.fb.rate,views:x.yt&&x.yt.views});d.setDate(d.getDate()+1)}return out}
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));for(const m of [1,2,2.5,5,10])if(m*p>=v)return m*p;return 10*p}
function drawEarnChart(){const box=$('#er-chart');if(!box||box.hidden)return;const days=erDays();const W=Math.max(300,box.clientWidth||800),H=280,L=52,R=8,T=10,B=28;
  const max=niceMax(Math.max(...days.map(x=>x.yt+x.fb),0)*1.05);const n=days.length;const bw=(W-L-R)/n;const gap=Math.max(1,Math.min(6,bw*.28));const y=v=>T+(H-T-B)*(1-v/max);
  const ticks=[0,max/4,max/2,max*3/4,max];let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily earnings, last ${n} days, YouTube and Facebook stacked">`;
  ticks.forEach(t=>{s+=`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e7f0" stroke-width="1"/><text x="${L-8}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="#5b6582">£${Number.isInteger(t)?t:t.toFixed(t<1?2:1)}</text>`});
  const every=n>40?14:7;
  days.forEach((x,i)=>{const x0=L+i*bw+gap/2,w=Math.max(1,bw-gap);const r=Math.min(4,w/2);
    const yt=Math.max(0,y(0)-y(x.yt)),fb=Math.max(0,y(0)-y(x.fb));
    if(yt>0)s+=`<path d="${barPath(x0,y(0)-yt,w,yt,fb>0?0:r)}" fill="var(--yt)"/>`;
    if(fb>0){const top=y(0)-yt-fb-(yt>0?2:0);s+=`<path d="${barPath(x0,top,w,fb,r)}" fill="var(--fb)"/>`}
    s+=`<rect data-i="${i}" x="${L+i*bw}" y="${T}" width="${bw}" height="${H-T-B}" fill="transparent"/>`;
    if(i%every===0||(i===n-1&&i%every>every/2))s+=`<text x="${x0+w/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#5b6582">${x.d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</text>`});
  s+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="#9aa6c4" stroke-width="1"/></svg><div class="tip" hidden></div>`;
  box.innerHTML=s;const tip=box.querySelector('.tip');
  if(!days.some(x=>x.yt+x.fb>0)){const c=earnConnected();box.insertAdjacentHTML('beforeend',`<p class="hempty" style="position:absolute;inset:40% 0 auto;text-align:center">${c.yt||c.fb?'No earnings in this period yet.':'Connect YouTube and Facebook below to see your earnings here.'}</p>`)}
  const show=(i,ev)=>{const x=days[i];if(!x)return;tip.hidden=false;
    tip.innerHTML=`<b>${x.d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} · ${gbpFmt(x.yt+x.fb)}</b><div><i style="background:var(--yt)"></i>YouTube ${gbpFmt(x.yt)}${x.views?' · '+x.views.toLocaleString('en-GB')+' views':''}</div><div><i style="background:var(--fb)"></i>Facebook ${gbpFmt(x.fb)}${x.usd!=null?` (${usdFmt(x.usd)} at ${x.rate})`:''}</div>`;
    const bx=box.getBoundingClientRect();let lx=(ev.clientX||0)-bx.left+12;if(lx+tip.offsetWidth>bx.width)lx=lx-tip.offsetWidth-24;tip.style.left=Math.max(0,lx)+'px';tip.style.top='8px'};
  box.querySelectorAll('rect[data-i]').forEach(r=>{r.addEventListener('mousemove',e=>show(+r.dataset.i,e));r.addEventListener('click',e=>show(+r.dataset.i,e))});
  box.querySelector('svg').addEventListener('mouseleave',()=>{tip.hidden=true})}
function barPath(x,y,w,h,r){r=Math.min(r,h,w/2);if(r<=0)return `M${x},${y}h${w}v${h}h${-w}z`;return `M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}z`}
function drawEarnTable(){const t=$('#er-table');if(!t||t.hidden)return;const days=erDays().slice().reverse();
  t.innerHTML='<table class="lt"><thead><tr><th>Day</th><th class="n">YouTube</th><th class="n">Facebook ($)</th><th class="n">Rate</th><th class="n">Facebook (£)</th><th class="n">Total</th></tr></thead><tbody>'+
    days.map(x=>`<tr><td>${x.d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</td><td class="n">${gbpFmt(x.yt)}</td><td class="n">${x.usd!=null?usdFmt(x.usd):'–'}</td><td class="n">${x.rate||'–'}</td><td class="n">${gbpFmt(x.fb)}</td><td class="n"><b>${gbpFmt(x.yt+x.fb)}</b></td></tr>`).join('')+'</tbody></table>'}
document.querySelectorAll('[data-er]').forEach(b=>b.onclick=()=>{erRange=+b.dataset.er;document.querySelectorAll('[data-er]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));drawEarnChart();drawEarnTable()});
$('#er-tbl').onclick=()=>{erTable=!erTable;$('#er-chart').hidden=erTable;$('#er-table').hidden=!erTable;$('#er-tbl').textContent=erTable?'Show as chart':'Show as table';renderEarnings()};
$('#er-refresh').onclick=async()=>{const b=$('#er-refresh');if(!(window.PB&&PB.earnings)){erMsg('Earnings work in the installed Studio.');return}b.disabled=true;b.textContent='Refreshing…';
  try{const r=await PB.earnings.sync(90);erMsg([r.ytError,r.fbError].filter(Boolean).join(' ')||(r.yt==null&&r.fb==null?'Connect YouTube or Facebook first (bottom of this page).':''))}catch(e){erMsg(e.message)}b.disabled=false;b.textContent='Refresh now'};
window.addEventListener('resize',()=>{if(curTab==='earnings')drawEarnChart()});
// back from Google / Facebook sign-in: #earnings?c=yt-ok
(function(){const h=location.hash||'';if(!h.startsWith('#earnings?'))return;const q=new URLSearchParams(h.split('?')[1]);const c=q.get('c'),why=q.get('why');
  const T={'yt-ok':'YouTube connected. Your earnings for the last 90 days are loading.','fb-ok':'Facebook connected. Your earnings for the last 90 days are loading.','cancelled':'Sign-in was cancelled.','expired':'That sign-in took too long. Try Connect again.','fb-nopage':'Facebook connected, but no pages came back. Make sure you ticked the Pundit Bible page when asked.','yt-failed':'YouTube didn’t connect','fb-failed':'Facebook didn’t connect'};
  setTimeout(()=>erMsg((T[c]||'Something went wrong')+(why?': '+why:'')),300);try{history.replaceState(null,'','#earnings')}catch(e){}})();

showTab((location.hash||'#home').slice(1).split(/[\/?]/)[0],true);
