
// ---------- Video tab: brand my reel, YouTube thumbnail, reel script + teleprompter ----------
const VP=['reel','thumb','script'];
document.querySelectorAll('#v-pills button').forEach(b=>b.onclick=()=>{VP.forEach(k=>{$('#vp-'+k).hidden=k!==b.dataset.v});document.querySelectorAll('#v-pills button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(b.dataset.v==='thumb')drawThumb()});
function fillPostSelects(){const opts='<option value="">Choose a post…</option>'+order.slice(0,60).map(id=>`<option value="${esc(id)}">${esc((posts[id].title||id).slice(0,70))}</option>`).join('');
  ['#r-post','#t-post','#s-post'].forEach(s=>{const el=$(s);if(!el)return;const v=el.value;el.innerHTML=opts;if(v&&posts[v])el.value=v})}
function pickerFor(inputSel,btnSel){const fi=$(inputSel);$(btnSel).addEventListener('click',()=>{try{if(fi.showPicker)fi.showPicker();else fi.click()}catch(e){fi.click()}})}
function onFile(fi,fn){let last=0;const h=()=>{const f=fi.files&&fi.files[0];if(!f)return;const n=Date.now();if(n-last<500)return;last=n;fn(f);setTimeout(()=>{fi.value=''},0)};fi.addEventListener('change',h);fi.addEventListener('input',h)}
async function faceBox(img,hint){
  if(!(sample&&canSeeImages))return isCutout(img)?alphaFocus(img):null;
  try{const blob=await shrinkBlob(img,1200,'image/jpeg');
    const r=await sample.json(`Find the main person's face in this photo${hint?' (it should be '+hint+')':''}. Reply with only JSON like {"face":{"x":0.41,"y":0.12,"w":0.2,"h":0.27}}: the face bounding box (top of hair to chin) as fractions of image width and height, x,y top-left. If there is no face, box the main subject.`,{images:blob});
    const f=r&&r.face;if(f&&[f.x,f.y,f.w,f.h].every(v=>typeof v==='number'&&isFinite(v))&&f.w>0.02&&f.h>0.02)return {x:f.x,y:f.y,w:f.w,h:f.h}}catch(e){}
  return isCutout(img)?alphaFocus(img):null}

// ===== Brand my reel =====
const RV=document.createElement('video');RV.playsInline=true;RV.setAttribute('playsinline','');RV.preload='auto';RV.crossOrigin='anonymous';
const rc=$('#r-canvas'),rx=rc.getContext('2d');let rReady=false,rPlaying=false,rRec=false,rAudio=null,rUrl=null;
const rSmall=cnv(54,96),rsx=rSmall.getContext('2d');
function reelFields(){return {tag:$('#r-tag').value.trim(),head:$('#r-head').value.trim(),q:$('#r-q').value.trim(),slide:$('#r-slide').checked}}
function drawReel(ctx,t,f){ // t = seconds since clip start (for the slide-in)
  const w=TW,h=TH;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  if(rReady&&RV.videoWidth){const vw=RV.videoWidth,vh=RV.videoHeight;const tall=vh/vw>1.45;
    if(tall){const s=Math.max(w/vw,h/vh);ctx.drawImage(RV,(w-vw*s)/2,(h-vh*s)/2,vw*s,vh*s)}
    else{rsx.drawImage(RV,0,0,54,96);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='brightness(.45)';ctx.drawImage(rSmall,-40,-40,w+80,h+80);ctx.restore();
      const s=w/vw;const dh=vh*s;ctx.drawImage(RV,0,(h-dh)/2-40,w,dh)}}
  else{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0a2c78');g.addColorStop(1,'#020a22');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.5)';ctx.font=BB(46);ctx.textAlign='center';ctx.fillText('Your video goes here',w/2,h/2);ctx.textAlign='left'}
  // top shade + brand pill + label + headline
  const lines=f.head?wrapFit(ctx,U(f.head),900,3,130,72):null;
  const topH=lines?300+lines.lines.length*lines.lh:240;
  let g=ctx.createLinearGradient(0,0,0,topH+160);g.addColorStop(0,'rgba(0,0,0,.78)');g.addColorStop(.7,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,topH+160);
  const by=120,bd=72;let x=60;ctx.fillStyle=NAVY;roundRect(ctx,48,by-8,LOGO_OK?420:330,bd+16,44);ctx.fill();
  if(LOGO_OK){ctx.save();ctx.beginPath();ctx.arc(56+bd/2,by+bd/2,bd/2,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.clip();ctx.drawImage(LOGO,56,by,bd,bd);ctx.restore();x=56+bd+18}
  SHADOW=false;const wf=ANTON(44);ctx.font=wf;const pw=ctx.measureText('PUNDIT ').width;const ty=by+bd/2-ctx.measureText('P').actualBoundingBoxAscent/2;text(ctx,'PUNDIT',x,ty,wf,WHITE);text(ctx,'BIBLE',x+pw,ty,wf,'#8fb8ff');
  let y=by+bd+40;if(f.tag){tag(ctx,60,y,U(f.tag),{tag:RED,tagText:WHITE});y+=80}
  if(lines){SHADOW=true;lines.lines.forEach((l,i)=>{text(ctx,l,60,y,ANTON(lines.size),i===lines.lines.length-1&&lines.lines.length>1?GOLD:WHITE);y+=lines.lh});SHADOW=false}
  // question bar, clear of the right-hand buttons and bottom caption area
  if(f.q){const L=qLayout(ctx,f.q,1080-168-190);if(L){const bh=QPAD*2+L.lh*L.lines.length;const bottom=1470;let top=bottom-bh;
      const k=f.slide?Math.max(0,Math.min(1,(t-1)/0.45)):1;if(k<=0)return;const e=1-Math.pow(1-k,3);const off=(1-e)*(-w);
      ctx.save();ctx.translate(off,0);ctx.fillStyle='#fff';ctx.fillRect(0,top,w,bh);ctx.fillStyle=RED;ctx.fillRect(0,top,w,8);
      bubble(ctx,54,top+bh/2+4,Math.min(78,bh*0.5));let yy=top+QPAD+(L.lh-L.size)/2+2;for(const l of L.lines){text(ctx,l,QX,yy,ANTON(L.size),NAVY);yy+=L.lh}ctx.restore()}}
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function wrapFit(ctx,t,maxW,maxLines,start,min){for(let s=start;s>=min;s-=4){const ls=wrap(ctx,t,ANTON(s),maxW);if(ls.length<=maxLines)return {lines:ls,size:s,lh:Math.round(s*1.05)}}const ls=wrap(ctx,t,ANTON(min),maxW).slice(0,maxLines);return {lines:ls,size:min,lh:Math.round(min*1.05)}}
function rStart(){return Math.max(0,+$('#r-start').value||0)}
function rEnd(){const d=RV.duration||0;const e=+$('#r-end').value;return e>0?Math.min(e,d||e):d}
function rDraw(){drawReel(rx,rPlaying?Math.max(0,RV.currentTime-rStart()):99,reelFields())}
['#r-tag','#r-head','#r-q','#r-slide'].forEach(s=>$(s).addEventListener('input',()=>{if(!rPlaying)rDraw()}));
$('#r-slide').addEventListener('change',()=>{if(!rPlaying)rDraw()});
onFile($('#r-file'),f=>{const m=$('#r-fmsg');if(f.type&&!/^video\//.test(f.type)){m.textContent='That isn’t a video. Pick an MP4 or MOV.';m.classList.add('warn');return}
  m.classList.remove('warn');m.textContent='Loading video…';rReady=false;if(rUrl)URL.revokeObjectURL(rUrl);rUrl=URL.createObjectURL(f);RV.src=rUrl;RV.load()});
pickerFor('#r-file','#r-pick');
RV.addEventListener('loadedmetadata',()=>{const d=RV.duration||0;$('#r-end').value=d?d.toFixed(1):'';$('#r-seek').max=String(d||1);
  $('#r-fmsg').textContent='Loaded: '+Math.round(d)+' seconds, '+RV.videoWidth+'×'+RV.videoHeight+(RV.videoHeight/RV.videoWidth>1.45?' (vertical, fills the screen).':' (landscape: it sits in the middle on a blurred background).')+(d>180?' Shorts must be under 3 minutes, so set an end time.':'');
  RV.currentTime=Math.min(0.1,d/2)});
RV.addEventListener('loadeddata',()=>{rReady=true;$('#r-play').disabled=false;$('#r-seek').disabled=false;$('#r-rec').disabled=false;rDraw()});
RV.addEventListener('seeked',()=>{if(!rPlaying)rDraw()});
RV.addEventListener('error',()=>{$('#r-fmsg').textContent='This video couldn’t be opened here. Try an MP4 (most phone videos are fine).';$('#r-fmsg').classList.add('warn')});
$('#r-seek').addEventListener('input',e=>{if(!rPlaying)RV.currentTime=+e.target.value});
function rLoop(){if(!rPlaying)return;rDraw();$('#r-seek').value=String(RV.currentTime);if(!rRec&&(RV.ended||RV.currentTime>=rEnd())){RV.pause();rPlaying=false;$('#r-play').textContent='Play preview';return}requestAnimationFrame(rLoop)}
$('#r-play').addEventListener('click',async()=>{if(rRec)return;const b=$('#r-play');
  if(rPlaying){RV.pause();rPlaying=false;b.textContent='Play preview';return}
  if(RV.currentTime<rStart()||RV.currentTime>=rEnd()-0.05)RV.currentTime=rStart();
  try{await RV.play()}catch(e){$('#r-msg').textContent='Tap Play again to start the preview.';return}rPlaying=true;b.textContent='Pause';rLoop()});
function ensureAudio(){if(rAudio)return rAudio;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{const ac=new AC();const src=ac.createMediaElementSource(RV);const dest=ac.createMediaStreamDestination();src.connect(dest);src.connect(ac.destination);rAudio={ac,dest};return rAudio}catch(e){return null}}
$('#r-rec').addEventListener('click',async()=>{const m=$('#r-msg'),b=$('#r-rec');if(!rReady){m.textContent='Upload a video first.';return}
  if(!window.MediaRecorder||!rc.captureStream){m.textContent='This browser can’t record video. Try Chrome or Safari.';m.classList.add('warn');return}
  const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const type=types.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}});if(!type){m.textContent='This browser can’t record video. Try Chrome or Safari.';return}
  const s0=rStart(),s1=rEnd();if(!(s1>s0+0.5)){m.textContent='The end time must be after the start time.';return}
  m.classList.remove('warn');b.disabled=true;$('#r-play').disabled=true;RV.pause();rPlaying=false;
  const au=ensureAudio();if(au&&au.ac.state==='suspended'){try{await au.ac.resume()}catch(e){}}
  RV.currentTime=s0;await new Promise(r=>{const h=()=>{RV.removeEventListener('seeked',h);r()};RV.addEventListener('seeked',h);setTimeout(r,1500)});
  const vs=rc.captureStream(30);const tracks=[...vs.getVideoTracks(),...(au?au.dest.stream.getAudioTracks():[])];const stream=new MediaStream(tracks);
  let rec;try{rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:10000000,audioBitsPerSecond:160000})}catch(e){rec=new MediaRecorder(stream)}
  const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r);
  rRec=true;rPlaying=true;rDraw();rec.start(250);
  try{await RV.play()}catch(e){rec.stop();await stopped;rRec=false;rPlaying=false;b.disabled=false;$('#r-play').disabled=false;m.textContent='The video wouldn’t play. Tap Make branded video again.';return}
  await new Promise(res=>{const step=()=>{rDraw();const t=RV.currentTime;m.textContent='Recording… '+Math.round(Math.min(1,(t-s0)/(s1-s0))*100)+'% (keep this screen open)';if(RV.ended||t>=s1||RV.paused&&t>s0+0.2)res();else requestAnimationFrame(step)};step()});
  RV.pause();rec.stop();await stopped;vs.getTracks().forEach(t=>t.stop());rRec=false;rPlaying=false;b.disabled=false;$('#r-play').disabled=false;$('#r-play').textContent='Play preview';
  const ext=type.indexOf('mp4')>=0?'mp4':'webm';const blob=new Blob(chunks,{type:type.split(';')[0]});
  const name='pundit-bible-reel-'+slug($('#r-head').value||'clip')+'.'+ext;
  if(downloads){try{await downloads.save({filename:name,data:blob});m.textContent='Saved. Upload it to TikTok, Reels and Shorts, and use the Publishing pack captions.'+(ext==='webm'?' (This browser made a .webm file; if your phone won’t upload it, make it in Safari or Chrome on your phone.)':'')}catch(e){m.textContent=e.code==='declined'?'':'Could not save the video ('+(e.code||'error')+').'}}
  else{const u=URL.createObjectURL(blob);const md=document.createElement('div');md.className='modal';md.innerHTML='<div><video controls playsinline style="max-height:78vh;max-width:100%"></video><p>Saving isn’t available in this view. Open the Studio in Claude to save the video. Tap outside to close.</p></div>';md.querySelector('video').src=u;md.addEventListener('click',e=>{if(e.target===md)md.remove()});document.body.appendChild(md);m.textContent=''}
});
$('#r-post').addEventListener('change',e=>{const p=posts[e.target.value];if(!p)return;const f=p.fields||{};
  $('#r-tag').value=(f.tag||'').slice(0,40);$('#r-head').value=String(p.title||hookOf(p)).slice(0,70);const lp=(captionBody(p).split(/\n\n/).pop()||'');$('#r-q').value=questionOf(p)||(/\?/.test(lp)?lp.replace(/\s*👇\s*$/,'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim():'');if(!rPlaying)rDraw()});

// ===== YouTube thumbnail =====
const TCW=1280,TCH=720;const tc=$('#t-canvas'),tx=tc.getContext('2d');
let tImg=null,tFocus=null,tTheme='brand';const tAdj={zoom:1,dx:0,dy:0};
function drawThumb(){const ctx=tx,th=THEMES[tTheme]||THEMES.brand;
  const g=ctx.createLinearGradient(0,0,TCW,TCH);g.addColorStop(0,rgb(th.c1));g.addColorStop(1,rgb(th.c2));ctx.fillStyle=g;ctx.fillRect(0,0,TCW,TCH);
  ctx.save();ctx.globalCompositeOperation='lighter';const r=ctx.createRadialGradient(900,300,0,900,300,620);r.addColorStop(0,rgb(th.glow,.55));r.addColorStop(1,rgb(th.glow,0));ctx.fillStyle=r;ctx.fillRect(0,0,TCW,TCH);ctx.restore();
  if(tImg){const cut=isCutout(tImg);const p=place(tImg,tFocus,990,250,310,TCW,TCH,!cut,tAdj);
    if(cut){const gc=cnv(TCW,TCH),gx=gc.getContext('2d');gx.drawImage(tImg,p.x,p.y,p.w,p.h);gx.globalCompositeOperation='source-in';gx.fillStyle=th.accent===GOLD?rgb(th.glow):th.accent;gx.fillRect(0,0,TCW,TCH);ctx.save();ctx.filter='blur(34px)';ctx.drawImage(gc,0,0);ctx.drawImage(gc,0,0);ctx.restore()}
    ctx.save();ctx.filter='contrast(1.15) saturate(1.25)';ctx.drawImage(tImg,p.x,p.y,p.w,p.h);ctx.restore();
    const d=mix(th,.85);const lg=ctx.createLinearGradient(0,0,TCW,0);lg.addColorStop(0,rgb(d,.96));lg.addColorStop(.36,rgb(d,.78));lg.addColorStop(.58,rgb(d,0));ctx.fillStyle=lg;ctx.fillRect(0,0,TCW,TCH)}
  const lines=$('#t-words').value.split('\n').map(s=>U(s.trim())).filter(Boolean).slice(0,3);
  const tg=$('#t-tag').value.trim();let y=tg?128:70;if(tg){SHADOW=false;tag(ctx,44,44,U(tg),{tag:RED,tagText:WHITE})}
  if(lines.length){const maxW=tImg?660:TCW-120;const avail=(TCH-y-150);let s=Math.min(210,Math.floor(avail/lines.length/1.02));for(const l of lines)s=Math.min(s,fit(ctx,l,ANTON,maxW,s,70));
    const lh=s*1.02;lines.forEach((l,i)=>{ctx.font=ANTON(s);const a=ctx.measureText(l).actualBoundingBoxAscent;ctx.lineJoin='round';ctx.lineWidth=Math.max(10,s*0.09);ctx.strokeStyle='#000';
      ctx.save();ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=30;ctx.shadowOffsetY=8;ctx.strokeText(l,44,y+a);ctx.restore();ctx.fillStyle=i===lines.length-1&&lines.length>1?GOLD:WHITE;ctx.fillText(l,44,y+a);y+=lh})}
  // logo, bottom-left (bottom-right is where YouTube puts the video length)
  const d=96,bx=44,by=TCH-d-36;if(LOGO_OK){ctx.save();ctx.beginPath();ctx.arc(bx+d/2,by+d/2,d/2,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.clip();ctx.drawImage(LOGO,bx,by,d,d);ctx.restore()}
  SHADOW=true;const f=ANTON(40);ctx.font=f;const pw=ctx.measureText('PUNDIT ').width;const ty=by+d/2-ctx.measureText('P').actualBoundingBoxAscent/2;const lx=LOGO_OK?bx+d+16:bx;text(ctx,'PUNDIT',lx,ty,f,WHITE);text(ctx,'BIBLE',lx+pw,ty,f,'#8fb8ff');SHADOW=false}
async function setThumbImg(img,hint){tImg=img;tFocus=null;tAdj.zoom=1;tAdj.dx=0;tAdj.dy=0;['#t-zoom','#t-dx','#t-dy'].forEach((s,i)=>{$(s).value=i?0:1});drawThumb();
  const m=$('#t-fmsg');if(sample&&canSeeImages){m.textContent='Finding the face…'}tFocus=await faceBox(img,hint);m.textContent='Photo added.';drawThumb()}
onFile($('#t-file'),async f=>{const m=$('#t-fmsg');try{const img=await decode(f);m.classList.remove('warn');await setThumbImg(img,$('#t-words').value.split('\n')[0])}catch(e){m.textContent='That photo couldn’t be opened. Try a JPG or PNG.';m.classList.add('warn')}});
pickerFor('#t-file','#t-pick');
['#t-words','#t-tag'].forEach(s=>$(s).addEventListener('input',drawThumb));
[['#t-zoom','zoom'],['#t-dx','dx'],['#t-dy','dy']].forEach(([s,k])=>$(s).addEventListener('input',e=>{tAdj[k]=+e.target.value;drawThumb()}));
$('#t-look').addEventListener('click',()=>{tTheme=THEME_ORDER[(THEME_ORDER.indexOf(tTheme)+1)%THEME_ORDER.length];drawThumb()});
$('#t-save').addEventListener('click',async()=>{drawThumb();await saveCanvas(tc,'pundit-bible-thumbnail-'+slug($('#t-words').value||'video')+'.jpg',$('#t-smsg'))});
function thumbWordsFallback(p){const t=U(stripTags(p.title||'')).replace(/[^A-Z0-9£$€%' -]/g,' ').split(/\s+/).filter(w=>w.length>1&&!/^(THE|A|AN|OF|TO|IN|ON|AND|FOR|IS|AT|BY|WITH)$/.test(w)).slice(0,4);return t.length>2?t.slice(0,2).join(' ')+'\n'+t.slice(2).join(' '):t.join(' ')}
$('#t-post').addEventListener('change',async e=>{const p=posts[e.target.value];if(!p)return;$('#t-words').value=thumbWordsFallback(p);$('#t-tag').value='';$('#t-about').value=[p.title,captionBody(p)].join('\n\n').slice(0,800);
  tTheme=THEMES[p.theme]?p.theme:'brand';drawThumb();
  const ph=p.photo;const key=e.target.value+':photo';const img=localImg[key]||(ph&&ph.id?await loadImgById(ph.id):null);
  if(img){tImg=img;tFocus=ph&&ph.focus||null;drawThumb();$('#t-fmsg').textContent='Using this post’s photo. Upload a different one if you like.'}else $('#t-fmsg').textContent='This post has no photo yet. Upload one.'});
$('#t-suggest').addEventListener('click',async()=>{const m=$('#t-fmsg'),box=$('#t-opts'),b=$('#t-suggest');const p=posts[$('#t-post').value];const topic=(p?p.title+'\n'+captionBody(p):$('#t-about').value||$('#t-words').value).slice(0,1500);
  if(!topic.trim()){m.textContent='Pick a post or type what the video is about first.';return}
  if(!sample){if(p){$('#t-words').value=thumbWordsFallback(p);drawThumb()}m.textContent='Claude isn’t available in this view, so these are from the title.';return}
  b.disabled=true;m.textContent='Thinking of words…';box.innerHTML='';
  try{const r=await askJSON(`Write 5 options for the big text on a YouTube thumbnail for Pundit Bible (UK football). Each option is 2-4 words in capitals, split over 2 lines with "\\n", shocking or curious enough to click, and it must NOT just repeat the title. Use only facts in this topic; no made-up numbers or quotes.
Topic:
${topic}
Reply with only JSON: ["LINE ONE\\nLINE TWO", ...]`,{cache:false});
    (Array.isArray(r)?r:[]).slice(0,5).forEach(o=>{const d=document.createElement('div');d.className='opt';d.innerHTML='<div class="row"><b></b><button class="ghost" type="button">Use</button></div>';d.querySelector('b').textContent=String(o).replace(/\n/g,' / ');
      d.querySelector('button').onclick=()=>{$('#t-words').value=String(o);drawThumb();box.innerHTML=''};box.appendChild(d)});m.textContent=box.children.length?'Pick one:':'Nothing came back. Try again.'}
  catch(e){m.textContent=sampleErr(e)}b.disabled=false});
function checkChapters(t){const ls=lines(t);if(!ls.length)return {ok:true,list:[],warn:''};const secs=s=>{const p=s.split(':').map(Number);return p.reduce((a,v)=>a*60+v,0)};
  const list=ls.map(l=>{const m=l.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–]?\s*(.+)$/);return m?{t:m[1],s:secs(m[1]),name:m[2].trim()}:null});
  if(list.some(x=>!x))return {ok:false,list:[],warn:'Each chapter line needs a time first, like 1:12 The result.'};
  if(list[0].s!==0)return {ok:false,list,warn:'YouTube chapters must start at 0:00.'};
  if(list.length<3)return {ok:false,list,warn:'YouTube needs at least 3 chapters to show them.'};
  for(let i=1;i<list.length;i++)if(list[i].s-list[i-1].s<10)return {ok:false,list,warn:'Each chapter must be at least 10 seconds long ('+list[i].t+' is too close).'};
  return {ok:true,list,warn:''}}
$('#t-write').addEventListener('click',async()=>{const m=$('#t-wmsg'),b=$('#t-write'),box=$('#t-titles');const about=$('#t-about').value.trim();
  if(!about){m.textContent='Say what the video is about first.';return}const ch=checkChapters($('#t-ch').value);if(!ch.ok){m.textContent=ch.warn;m.classList.add('warn');return}m.classList.remove('warn');
  if(!sample){m.textContent='This needs Claude, which isn’t available in this view.';return}
  b.disabled=true;m.textContent='Writing… (up to a minute)';box.innerHTML='';
  try{const r=await askJSON(`You are the YouTube strategist for Pundit Bible, a UK football channel. Write for a long-form video.
About the video:
${about.slice(0,3000)}
Write:
- "titles": 5 different titles, each under 70 characters (YouTube allows 100 but long titles get cut off), names and the key search words near the start, curiosity without lying, no clickbait promises the video can't keep, no ALL-CAPS titles (one capitalised word is fine), UK English.
- "description": first 2 lines are a hook that makes sense in search results (they show before "more"); then 2-3 short lines on what's covered; then "Follow Pundit Bible for daily football takes."; then EXACTLY 3 hashtags on the last line (these show above the title): broad, club/player, competition or topic. Do NOT write chapters or timestamps.
- "tags": 8-15 search keywords/phrases, comma separated, under 450 characters total (names, clubs, competition, "football", "Pundit Bible").
Only use facts from the text above.
Reply with only JSON: {"titles":["..."],"description":"...","tags":"..."}`,{cache:false});
    const chap=ch.list.length?'\n\nChapters\n'+ch.list.map(x=>x.t+' '+x.name).join('\n'):'';
    let desc=clipTags(String(r&&r.description||''),5);
    if(chap){const ls=desc.split('\n');let i=ls.length-1;while(i>0&&!/#/.test(ls[i]))i--;if(i>0&&/^\s*#/.test(ls[i]))desc=ls.slice(0,i).join('\n').trim()+chap+'\n\n'+ls.slice(i).join('\n');else desc+=chap}
    $('#t-desc').value=desc;$('#t-tags').value=String(r&&r.tags||'').slice(0,480);
    (r&&Array.isArray(r.titles)?r.titles:[]).slice(0,5).forEach(t=>{const d=document.createElement('div');d.className='opt';d.innerHTML='<div><b></b> <span class="msg"></span></div><div class="row"><button class="ghost" type="button">Copy title</button><span class="msg cm"></span></div>';
      d.querySelector('b').textContent=String(t);d.querySelector('.msg').textContent='('+String(t).length+' chars)';d.querySelector('button').onclick=()=>copyText(String(t),d.querySelector('.cm'));box.appendChild(d)});
    m.textContent=box.children.length?'Pick a title. The description has your chapters'+(chap?'':' (add some above to get chapters)')+' and 3 hashtags.':'Nothing came back. Try again.'}
  catch(e){m.textContent=sampleErr(e)}b.disabled=false});
$('#t-copyd').addEventListener('click',()=>copyText($('#t-desc').value,$('#t-cmsg'),$('#t-desc')));
$('#t-copyt').addEventListener('click',()=>copyText($('#t-tags').value,$('#t-cmsg'),$('#t-tags')));

// ===== Reel script + teleprompter =====
let sLen=30,sStyle='Hot take',script=null;
document.querySelectorAll('#s-len button').forEach(b=>b.onclick=()=>{sLen=+b.dataset.len;document.querySelectorAll('#s-len button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
document.querySelectorAll('#s-style button').forEach(b=>b.onclick=()=>{sStyle=b.dataset.st;document.querySelectorAll('#s-style button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
$('#s-post').addEventListener('change',e=>{const p=posts[e.target.value];if(p){$('#s-topic').value=[p.title,captionBody(p)].join('\n\n').slice(0,1500);if(p.script){script=p.script;showScript()}}});
function scriptFallback(topic){const ls=lines(stripTags(topic)).filter(l=>l.length>3);const q=(posts[$('#s-post').value]&&questionOf(posts[$('#s-post').value]))||'What do you reckon?';
  const hook=ls[0]||topic.slice(0,80);const rest=ls.slice(1).filter(l=>l!==q&&!/👇/.test(l));
  const beats=[0,1,2].map(i=>({say:rest[i]||['Here’s what happened.','Here’s why it matters.','And here’s my take.'][i],onscreen:U((rest[i]||['WHAT HAPPENED','WHY IT MATTERS','MY TAKE'][i]).split(/\s+/).slice(0,4).join(' '))}));
  return {hook:{say:hook,onscreen:U(hook.split(/\s+/).slice(0,5).join(' '))},beats,question:{say:q.replace(/👇/g,'').trim()+' Tell me in the comments.',onscreen:U(q.replace(/👇/g,'').trim())},fallback:true}}
function timings(sc){const all=[sc.hook,...sc.beats,sc.question];const words=all.map(x=>String(x.say||'').split(/\s+/).filter(Boolean).length);const tot=words.reduce((a,b)=>a+b,0)||1;
  const secs=tot/2.5;let t=0;return all.map((x,i)=>{const d=words[i]/2.5;const r=[t,t+d];t+=d;return r}).map(([a,b])=>fmtS(a)+'–'+fmtS(b)).concat([Math.round(secs)])}
function fmtS(s){s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function showScript(){const out=$('#s-out');out.innerHTML='';if(!script)return;const tm=timings(script);const parts=[['Hook',script.hook],...script.beats.map((b,i)=>['Beat '+(i+1),b]),['Question',script.question]];
  parts.forEach(([lab,x],i)=>{const d=document.createElement('div');d.className='opt';d.innerHTML='<div class="term"><b></b> · <span></span></div><div class="say" style="font-size:18px"></div><div class="msg">On screen: <b class="os"></b></div>'+(x.visual?'<div class="msg">Show: <span class="vi"></span></div>':'');
    d.querySelector('b').textContent=lab;d.querySelector('span').textContent=tm[i];d.querySelector('.say').textContent=x.say||'';d.querySelector('.os').textContent=x.onscreen||'';if(x.visual)d.querySelector('.vi').textContent=x.visual;out.appendChild(d)});
  $('#s-amsg').textContent='About '+tm[tm.length-1]+' seconds read at a normal pace.'+(script.fallback?' (Quick version from the post: Claude wasn’t available.)':'');$('#s-actions').hidden=false}
function scriptText(){if(!script)return '';const parts=[['HOOK',script.hook],...script.beats.map((b,i)=>['BEAT '+(i+1),b]),['QUESTION',script.question]];return parts.map(([l,x])=>l+'\n'+x.say+'\n[On screen: '+(x.onscreen||'')+']').join('\n\n')}
$('#s-write').addEventListener('click',async()=>{const m=$('#s-msg'),b=$('#s-write');const topic=$('#s-topic').value.trim();if(!topic){m.textContent='Pick a post or type a topic first.';return}
  if(!sample){script=scriptFallback(topic);showScript();m.textContent='';return}
  b.disabled=true;m.textContent='Writing your script…';
  try{const words=Math.round(sLen*2.5);const r=await askJSON(`Write a ${sLen}-second vertical video script (about ${words} spoken words in total) for Pundit Bible, a UK football page. The presenter talks straight to camera. Style: ${sStyle}.
Structure:
- hook: the first 2 seconds; must stop the scroll (a bold claim, a surprising fact from the topic, or a direct challenge). Max 14 words.
- beats: exactly 3 quick beats that build the story and the argument; each 1-3 short sentences.
- question: one easy question that makes people comment, said to camera.
For every part also give "onscreen": 2-5 words in capitals for the on-screen text, and "visual": a short note on what to show or do (e.g. hold up phone with the stat, cut to clip, point at camera).
Rules: spoken, natural UK English, short sentences, confident and a bit cheeky; use ONLY facts in the topic below, no invented numbers or quotes; no engagement bait ("like if", "share if", "tag a mate", "type YES").
Topic:
${topic.slice(0,3000)}
Reply with only JSON: {"hook":{"say":"...","onscreen":"...","visual":"..."},"beats":[{"say":"...","onscreen":"...","visual":"..."},{...},{...}],"question":{"say":"...","onscreen":"...","visual":"..."}}`,{cache:false});
    if(!r||!r.hook||!Array.isArray(r.beats)||!r.question){m.textContent='The script didn’t come back in the right shape. Try again.';b.disabled=false;return}
    script={hook:r.hook,beats:r.beats.slice(0,3),question:r.question};showScript();m.textContent='';
    const pid=$('#s-post').value;if(pid&&posts[pid]){posts[pid].script=script;save(pid,{script})}}
  catch(e){m.textContent=sampleErr(e)}b.disabled=false});
$('#s-copy').addEventListener('click',()=>copyText(scriptText(),$('#s-amsg')));
$('#s-toreel').addEventListener('click',()=>{if(!script)return;$('#r-head').value=script.hook.onscreen||script.hook.say;$('#r-q').value=script.question.onscreen||'';
  document.querySelector('#v-pills [data-v="reel"]').click();rDraw();window.scrollTo({top:$('#vp-reel').offsetTop-20,behavior:'smooth'})});
// teleprompter
const PR={on:false,y:0,last:0,raf:0};
function prText(){const t=$('#p-text');t.innerHTML='';const parts=[['Hook',script.hook],...script.beats.map((b,i)=>['Beat '+(i+1),b]),['Question',script.question]];
  parts.forEach(([l,x])=>{const h=document.createElement('div');h.className='plab';h.textContent=l+(x.onscreen?' · on screen: '+x.onscreen:'');const p=document.createElement('p');p.textContent=x.say||'';t.append(h,p)})}
function prApply(){const t=$('#p-text');t.style.fontSize=$('#p-size').value+'px';t.style.transform='translateY('+(-PR.y)+'px)'+($('#p-mirror').checked?' scaleX(-1)':'')}
function prSpeed(){const t=$('#p-text');const words=t.textContent.split(/\s+/).filter(Boolean).length||1;const secs=words/(+$('#p-speed').value/60);return Math.max(20,(t.scrollHeight)/secs)}
function prTick(ts){if(!PR.on)return;const dt=PR.last?(ts-PR.last)/1000:0;PR.last=ts;PR.y+=prSpeed()*dt;const max=$('#p-text').scrollHeight;if(PR.y>=max){PR.y=max;prStop();$('#p-go').textContent='Start';}prApply();PR.raf=requestAnimationFrame(prTick)}
function prStop(){PR.on=false;cancelAnimationFrame(PR.raf);$('#p-go').textContent='Resume'}
async function prStart(){if(PR.y===0){const c=$('#p-count');c.hidden=false;for(const n of ['3','2','1']){c.textContent=n;await new Promise(r=>setTimeout(r,700))}c.hidden=true}PR.on=true;PR.last=0;$('#p-go').textContent='Pause';PR.raf=requestAnimationFrame(prTick)}
$('#s-prompt').addEventListener('click',()=>{if(!script)return;prText();PR.y=0;prApply();$('#prompter').hidden=false;$('#p-go').textContent='Start';document.body.style.overflow='hidden'});
$('#p-go').addEventListener('click',()=>{PR.on?prStop():prStart()});
$('#p-scroll').addEventListener('click',()=>{PR.on?prStop():prStart()});
$('#p-back').addEventListener('click',()=>{prStop();PR.y=0;prApply();$('#p-go').textContent='Start'});
['#p-size','#p-mirror'].forEach(s=>$(s).addEventListener('input',prApply));$('#p-mirror').addEventListener('change',prApply);
$('#p-close').addEventListener('click',()=>{prStop();$('#prompter').hidden=true;document.body.style.overflow=''});
document.addEventListener('keydown',e=>{if($('#prompter').hidden)return;if(e.key===' '){e.preventDefault();PR.on?prStop():prStart()}if(e.key==='Escape')$('#p-close').click()});
