
// ===== 1-minute TikTok news video: Claude's script, animated scenes, your voice =====
const LW=1080,LH=1920;const lc=$('#l-canvas'),lx=lc.getContext('2d');
let lScript=null,lPostId='',lImgs={},lCard=null,lPlaying=false,lRec=false,lT0=0,lIdx=0,lSceneStart=0,lRaf=0,lSkip=false;
const lPace=()=>Number($('#l-pace').value)||2.5;
const lWords=s=>String(s||'').split(/\s+/).filter(Boolean).length;
function lDur(sc){return Math.max(2.4,lWords(sc.say)/lPace()+0.35)}
function lTotal(){if(!lScript)return 0;return lScript.scenes.reduce((a,s)=>a+lDur(s),0)}
function lTimeline(){const out=[];let t=0;(lScript?lScript.scenes:[]).forEach((s,i)=>{let d=lDur(s);out.push({s,i,t0:t,d});t+=d});
  // TikTok only pays for videos over a minute: hold the last scene until 61.5s if needed
  if(out.length&&t<61.5){out[out.length-1].d+=61.5-t}return out}
function lShowLen(){const t=lTotal();const el=$('#l-len');if(!lScript){el.textContent='';return}
  el.textContent='About '+Math.floor(t/60)+':'+String(Math.round(t%60)).padStart(2,'0')+' at this pace.'+(t<61?' That’s under a minute, so the last card is held until 1:01. Better: add a line or two so it’s naturally over a minute.':' Over a minute, so it qualifies.');el.style.color=t<61?'var(--red)':''}

// ---- drawing ----
function lCover(img,t,dir,zoom,filt){const sc0=Math.max(LW/img.width,LH/img.height);const z=(zoom||1.08)+0.1*t;const s=sc0*z;const w=img.width*s,h=img.height*s;
  const dx=(dir%2?-1:1)*40*(t-.5),dy=(dir%3?1:-1)*30*(t-.5);lx.save();lx.filter=filt||'contrast(1.08) saturate(1.12)';lx.drawImage(img,(LW-w)/2+dx,(LH-h)/2.4+dy,w,h);lx.restore()}
function lShade(from,a1){const g=lx.createLinearGradient(0,from,0,LH);g.addColorStop(0,'rgba(4,6,14,0)');g.addColorStop(.4,'rgba(4,6,14,'+(a1*.8)+')');g.addColorStop(1,'rgba(4,6,14,'+a1+')');lx.fillStyle=g;lx.fillRect(0,from,LW,LH-from);
  const t=lx.createLinearGradient(0,0,0,360);t.addColorStop(0,'rgba(4,6,14,.6)');t.addColorStop(1,'rgba(4,6,14,0)');lx.fillStyle=t;lx.fillRect(0,0,LW,360)}
function lBg(th){const g=lx.createLinearGradient(0,0,0,LH);g.addColorStop(0,rgb(th.c1));g.addColorStop(1,rgb(th.c2));lx.fillStyle=g;lx.fillRect(0,0,LW,LH)}
function lRich(t,x,y,maxW,maxH,start,min,align){const r=(function(){for(let s=start;s>=min;s-=4){lx.font=XB(s);const rr=richLines(lx,t,XB(s),maxW);if(rr.lines.length*s*1.12<=maxH)return {...rr,size:s}}lx.font=XB(min);return {...richLines(lx,t,XB(min),maxW),size:min}})();
  const h=r.lines.length*r.size*1.12;SHADOW=true;drawRich(lx,r,x,y-h/2,1.12,GOLD,align||'center');SHADOW=false;return h}
// the words to say, scrolling as you speak: doubles as captions and as your prompter
function lSubs(text,frac){const words=String(text||'').split(/\s+/).filter(Boolean);if(!words.length)return;lx.font=F(700,46,'Barlow');
  const lines=[];let cur=[],w=0;const max=LW-300;for(const wd of words){const ww=lx.measureText(wd+' ').width;if(cur.length&&w+ww>max){lines.push(cur);cur=[];w=0}cur.push(wd);w+=ww}if(cur.length)lines.push(cur);
  const said=Math.floor(frac*words.length);let k=0;const lineIdx=lines.findIndex(l=>{k+=l.length;return k>said});const start=Math.max(0,Math.min(lines.length-2,lineIdx<0?lines.length-2:lineIdx));
  const show=lines.slice(start,start+2);let n=lines.slice(0,start).reduce((a,l)=>a+l.length,0);
  const y0=1330;lx.fillStyle='rgba(4,6,14,.72)';const bh=show.length*64+36;if(lx.roundRect){lx.beginPath();lx.roundRect(50,y0-18,LW-200,bh,22);lx.fill()}else lx.fillRect(50,y0-18,LW-200,bh);
  show.forEach((ln,i)=>{let x=80;const tw2=ln.reduce((a,wd)=>a+lx.measureText(wd+' ').width,0);x=LCX-tw2/2;ln.forEach(wd=>{lx.fillStyle=n<said?'#ffffff':'rgba(255,255,255,.5)';if(n===said)lx.fillStyle=GOLD;lx.fillText(wd,x,y0+30+i*64);x+=lx.measureText(wd+' ').width;n++})})}
function lProgress(t,total){lx.fillStyle='rgba(255,255,255,.18)';lx.fillRect(0,0,LW,10);lx.fillStyle=GOLD;lx.fillRect(0,0,LW*Math.min(1,t/total),10)}
function lBrand(th){lx.save();lx.translate(0,110);igBrand(lx,th);lx.restore()}
// keep words clear of TikTok's buttons (right edge) and caption (bottom)
const LCX=LW/2-50,LTW=LW-260;
function lScene(sc,p,lt,th,src){const img=lImgs.photo||lImgs.photo2;const v=sc.visual||'photo';
  if(img)lCover(img,lt,sc._i||0,1.06);else if(lCard){lBg(th);lCover(lCard,lt,sc._i||0,1.25,'blur(28px) brightness(.5) saturate(1.2)')}else lBg(th);
  if(v==='card'&&lCard){lShade(0,.75);const s=0.72+0.04*lt;const w=LW*s,h=w*lCard.height/lCard.width;lx.save();lx.shadowColor='rgba(0,0,0,.6)';lx.shadowBlur=40;lx.drawImage(lCard,LCX-w/2,230+(1-s)*100,w,h);lx.restore();return}
  lShade(560,.94);
  if(v==='quote'){lx.save();SHADOW=false;text(lx,'“',LCX,620,ANTON(220),GOLD,'center');lx.restore();lRich('“'+String(sc.quote||sc.onscreen||'').replace(/^["“]|["”]$/g,'')+'”',LCX,1000,LTW,520,76,44,'center');if(sc.by){text(lx,U(sc.by),LCX,1230,BB(46),GOLD,'center')}return}
  if(v==='number'){const big=String(sc.big||'');const bs=fit(lx,big,ANTON,LTW,230,90);SHADOW=true;text(lx,big,LCX,720,ANTON(bs),GOLD,'center');SHADOW=false;lRich(sc.onscreen||'',LCX,1110,LTW,300,64,40,'center');return}
  if(v==='question'){lRich(sc.onscreen||sc.say||'',LCX,900,LTW,520,92,52,'center');return}
  lRich(sc.onscreen||'',LCX,980,LTW,460,96,52,'center')}
function lDraw(t){const p=posts[lPostId];const th=THEMES[(p&&p.theme)]||THEMES.brand;
  if(!lScript||!p){lBg(THEMES.brand);SHADOW=false;text(lx,'Pick a post, then',LW/2,820,XB(64),'#fff','center');text(lx,'Write the 1-minute script',LW/2,910,XB(64),GOLD,'center');return}
  const tl=lTimeline();const total=tl.reduce((a,x)=>Math.max(a,x.t0+x.d),0);
  let cur=tl.find(x=>t>=x.t0&&t<x.t0+x.d)||tl[tl.length-1];if(lRec||lPlaying){cur=tl[Math.min(lIdx,tl.length-1)];}
  const lt=Math.min(1,Math.max(0,(lRec||lPlaying?(t-lSceneStart):(t-cur.t0))/cur.d));
  cur.s._i=cur.i;lScene(cur.s,p,lt,th);
  // fade in each scene
  if(lt<0.06){lx.fillStyle='rgba(4,6,14,'+(1-lt/0.06)*0.7+')';lx.fillRect(0,0,LW,LH)}
  lSubs(cur.s.say,lt*1.02);lProgress(t,total);lBrand(th);
  const s=(p.fields&&p.fields.source)||(p.sources&&p.sources[0]&&p.sources[0].t)||'';if(s&&s!=='Source'){SHADOW=false;text(lx,'Source | '+s,80,1560,F(600,30,'Barlow'),'rgba(255,255,255,.8)')}}

// ---- script ----
function lScriptFallback(p){const paras=stripTags(captionBody(p)).split(/\n\n+/).map(x=>x.replace(/\s*👇\s*$/,'').trim()).filter(Boolean);
  const scenes=[{say:paras[0]||p.title,onscreen:p.title,visual:'card'}];paras.slice(1,-1).forEach(x=>scenes.push({say:x,onscreen:x.split(/[.!?]/)[0].slice(0,60),visual:'photo'}));
  scenes.push({say:(paras[paras.length-1]||'What do you make of it?')+' Let me know in the comments.',onscreen:paras[paras.length-1]||'What do you think?',visual:'question'});
  return {scenes,caption:packOf(p).tiktok}}
function lShowScript(){const box=$('#l-script');box.innerHTML='';if(!lScript)return;
  lScript.scenes.forEach((sc,i)=>{const d=document.createElement('div');d.className='card';d.style.cssText='padding:10px;display:grid;gap:6px';
    d.innerHTML='<div class="term"><b></b> · <span></span></div><textarea rows="2" aria-label="What you say"></textarea><input type="text" aria-label="Big words on screen">';
    d.querySelector('b').textContent=(i===0?'Hook':i===lScript.scenes.length-1?'Ending':'Line '+i);d.querySelector('span').textContent={card:'your card',photo:'photo + big words',quote:'quote',number:'big number',question:'question'}[sc.visual]||sc.visual;
    const ta=d.querySelector('textarea'),inp=d.querySelector('input');ta.value=sc.say||'';inp.value=sc.onscreen||'';
    ta.oninput=()=>{sc.say=ta.value;lShowLen()};inp.oninput=()=>{sc.onscreen=inp.value;lDraw(0)};box.appendChild(d)});lShowLen()}
async function lLoadPost(id){lPostId=id;lScript=null;$('#l-script').innerHTML='';$('#l-len').textContent='';const p=posts[id];if(!p){lDraw(0);return}
  lImgs=await photosFor(id);lCard=document.createElement('canvas');try{render(lCard,p,lImgs,0)}catch(e){lCard=null}
  $('#l-cap').value=packOf(p).tiktok;$('#l-wmsg').textContent=lImgs.photo?'Ready. Write the script next.':'This post has no photo yet: add one to the post first for a better video (it still works without).';lDraw(0)}
$('#l-post').addEventListener('change',e=>lLoadPost(e.target.value));
$('#l-write').addEventListener('click',async()=>{const m=$('#l-wmsg'),b=$('#l-write');const p=posts[lPostId];if(!p){m.textContent='Pick a post first.';return}
  if(!sample){lScript=lScriptFallback(p);lShowScript();lDraw(0);m.textContent='Made a simple script from the caption (Claude isn’t available here).';return}
  b.disabled=true;m.textContent='Claude is writing your 1-minute script…';
  try{const f=p.fields||{};const r=await askJSON(`Write a spoken TikTok news script for Pundit Bible (UK football page), read aloud by the presenter in his own voice over moving visuals.
STRICT: use only the facts, numbers and quotes below. Quotes word for word. Nothing from memory.
Length: 175-215 words in total, so it runs 65-80 seconds (TikTok only pays for videos over one minute). Short spoken sentences, natural and confident, like a mate who knows football telling you the news.
Structure, 7-9 scenes:
1. Hook (first scene, under 15 words): the headline in a way that stops the scroll. visual "card".
2-7. The story: what happened, the key numbers, who said what, why it matters, what happens next. One idea per scene. visual "photo" (or "quote" for a word-for-word quote with its speaker in "by", or "number" for one striking figure in "big").
Last: one easy question for the comments. visual "question".
Each scene: "say" (the words he reads), "onscreen" (max 8 big words, sentence case, *stars* round 1-3 key words).
Also "caption": the TikTok caption written like a short news story, 80-150 words, headline first line with the key names in it (TikTok search reads it), then the facts, then the question, then EXACTLY these 4 hashtags on the last line: ${tagsFor(p,'tiktok').join(' ')}.

Post title: ${p.title||''}
Card: ${JSON.stringify(f).slice(0,1500)}
Caption: ${stripTags(p.caption||'').slice(0,2500)}

Reply with only JSON: {"scenes":[{"say":"...","onscreen":"...","visual":"card|photo|quote|number|question","quote":"","by":"","big":""}],"caption":"..."}`,{cache:false,maxTokens:3000});
    if(!r||!Array.isArray(r.scenes)||r.scenes.length<3)throw {message:'The script didn’t come back in the right shape. Try again.'};
    lScript={scenes:r.scenes.map(s=>({say:String(s.say||''),onscreen:String(s.onscreen||''),visual:['card','photo','quote','number','question'].includes(s.visual)?s.visual:'photo',quote:s.quote||'',by:s.by||'',big:s.big||''})),caption:String(r.caption||'')};
    if(lScript.caption)$('#l-cap').value=lScript.caption;lShowScript();lDraw(0);m.textContent='Done. Edit any line, then Preview or Record.'}
  catch(e){m.textContent=e.message||'Couldn’t write the script.'}b.disabled=false});
$('#l-pace').addEventListener('input',lShowLen);

// ---- play / record ----
function lStop(){lPlaying=false;lRec=false;cancelAnimationFrame(lRaf);$('#l-next').hidden=true;$('#l-play').textContent='Preview';$('#l-rec').disabled=false;$('#l-play').disabled=false}
function lRun(onEnd){const tl=lTimeline();lIdx=0;lT0=performance.now()/1000;lSceneStart=0;lSkip=false;
  const step=()=>{if(!lPlaying&&!lRec)return;const t=performance.now()/1000-lT0;const cur=tl[lIdx];
    if(lSkip||t-lSceneStart>=cur.d){lSkip=false;if(lIdx>=tl.length-1){if(t>=61.5||!lRec){onEnd&&onEnd();return}}else{lIdx++;lSceneStart=t}}
    lDraw(t);$('#l-msg').textContent=(lRec?'Recording ':'Preview ')+Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+(lRec?' · read the words along the bottom; tap Next line if you finish early':'');lRaf=requestAnimationFrame(step)};step()}
$('#l-next').addEventListener('click',()=>{lSkip=true});
$('#l-play').addEventListener('click',()=>{if(!lScript){$('#l-msg').textContent='Write the script first.';return}if(lPlaying){lStop();lDraw(0);return}
  lPlaying=true;$('#l-play').textContent='Stop';$('#l-next').hidden=false;lRun(()=>{lStop();$('#l-msg').textContent='That’s the preview. Record when you’re ready.'})});
$('#l-rec').addEventListener('click',async()=>{const m=$('#l-msg');if(!lScript){m.textContent='Write the script first.';return}
  if(!window.MediaRecorder||!lc.captureStream){m.textContent='This browser can’t record video. Try Chrome or Safari.';return}
  const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const type=types.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}});if(!type){m.textContent='This browser can’t record video. Try Chrome or Safari.';return}
  let mic=null;if($('#l-mic').checked){try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(e){m.textContent='The microphone wasn’t allowed. Allow it in your browser or phone settings, or untick the microphone box to make a silent video and add your voice in TikTok.';return}}
  $('#l-rec').disabled=true;$('#l-play').disabled=true;
  for(const n of ['3','2','1']){lDraw(0);lx.fillStyle='rgba(0,0,0,.55)';lx.fillRect(0,0,LW,LH);text(lx,n,LW/2,760,ANTON(360),'#fff','center');m.textContent='Get ready… '+n;await new Promise(r=>setTimeout(r,800))}
  const vs=lc.captureStream(30);const stream=new MediaStream([...vs.getVideoTracks(),...(mic?mic.getAudioTracks():[])]);
  let rec;try{rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8000000,audioBitsPerSecond:160000})}catch(e){rec=new MediaRecorder(stream)}
  const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r);
  lRec=true;$('#l-next').hidden=false;rec.start(250);
  await new Promise(res=>lRun(res));
  rec.stop();await stopped;vs.getTracks().forEach(t=>t.stop());if(mic)mic.getTracks().forEach(t=>t.stop());lStop();
  const ext=type.indexOf('mp4')>=0?'mp4':'webm';const blob=new Blob(chunks,{type:type.split(';')[0]});const p=posts[lPostId];
  const name='pundit-bible-tiktok-'+slug((p&&p.title)||'news')+'.'+ext;
  if(downloads){try{await downloads.save({filename:name,data:blob});m.textContent='Saved. In TikTok: + → Upload → pick the video, paste the caption below, and keep the original sound (your voice).'+(ext==='webm'?' (This browser made a .webm file; if TikTok won’t take it, record in Safari or Chrome on your phone.)':'')}catch(e){m.textContent=e.code==='declined'?'':'Could not save the video.'}}
  else{const u=URL.createObjectURL(blob);const md=document.createElement('div');md.className='modal';md.innerHTML='<div><video controls playsinline style="max-height:78vh;max-width:100%"></video></div>';md.querySelector('video').src=u;md.addEventListener('click',e=>{if(e.target===md)md.remove()});document.body.appendChild(md)}});
$('#l-copy').addEventListener('click',()=>copyText($('#l-cap').value,$('#l-cmsg'),$('#l-cap')));
// open straight from a post
function openLongTikTok(id){showTab('video');const b=document.querySelector('#v-pills [data-v=long]');if(b)b.click();fillPostSelects();$('#l-post').value=id;lLoadPost(id)}
