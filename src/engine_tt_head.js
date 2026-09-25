
// ---------- TikTok (1080x1920) ----------
const TW=1080,TH=1920;
const TT={x:38,y:250,s:0.86};           // where the 4:5 content sits inside TikTok's safe zone
function cnv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function bgTT(o,th){
  const g=o.createLinearGradient(0,0,0,TH);g.addColorStop(0,rgb(th.c1));g.addColorStop(1,rgb(th.c2));o.fillStyle=g;o.fillRect(0,0,TW,TH);
  o.save();o.globalCompositeOperation='lighter';const r=o.createRadialGradient(740,620,0,740,620,900);r.addColorStop(0,rgb(th.glow,.45));r.addColorStop(1,rgb(th.glow,0));o.fillStyle=r;o.fillRect(0,0,TW,TH);o.restore();
  o.save();o.strokeStyle='rgba(255,255,255,.035)';o.lineWidth=14;for(let i=-TH;i<TW+TH;i+=46){o.beginPath();o.moveTo(i,0);o.lineTo(i+TH,TH);o.stroke()}o.restore();
}
function ttQuestion(q){
  const c=cnv(TW,300);const o=c.getContext('2d');if(!q)return {c,h:0};
  const x=TT.x,w=TW-2*TT.x-40;const L=qLayout(o,q,w-150);const h=QPAD*2+L.lh*L.lines.length;
  o.fillStyle='#ffffff';o.fillRect(x,0,w,h);o.fillStyle=RED;o.fillRect(x,0,w,8);
  bubble(o,x+22,h/2+4,Math.min(72,h*0.5));let y=QPAD+(L.lh-L.size)/2+2;L.lines.forEach(l=>{text(o,l,x+130,y,ANTON(L.size),NAVY);y+=L.lh});return {c,h};
}
function ttBrand(){
  const c=cnv(TW,120);const o=c.getContext('2d');const d=84,x=40,y=18;
  if(LOGO_OK){o.save();o.beginPath();o.arc(x+d/2,y+d/2,d/2,0,Math.PI*2);o.fillStyle='#fff';o.fill();o.clip();o.drawImage(LOGO,x,y,d,d);o.restore()}
  const s=SHADOW;SHADOW=true;const f=ANTON(44);o.font=f;const w1=o.measureText('PUNDIT').width;
  text(o,'PUNDIT',x+d+18,y+20,f,WHITE);text(o,'BIBLE',x+d+18+w1+12,y+20,f,'#8fb8ff');SHADOW=s;return c;
}
// Builds the separate layers so the video can animate them.
function ttLayers(post,imgs,slide){
  const th=THEMES[post.theme]||THEMES.charcoal;const f=post.fields||{};const tpl=post.template;
  const bg=cnv(TW,TH);const o=bg.getContext('2d');bgTT(o,th);
  const content=cnv(W,H);const cx=content.getContext('2d');
  const L={bg,content,brand:ttBrand(),q:ttQuestion(f.question),th};
  if(tpl==='carousel'||tpl==='guess'||tpl==='h2h'){ // the 4:5 slide on a blurred copy of itself
    const s=cnv(W,H);render(s,post,imgs,slide||0);const e=exportCanvas(s,'story');o.drawImage(e,0,0);L.content=null;L.q={c:cnv(1,1),h:0};L.brand=null;return L}
  if(tpl==='split'){
    const cols=[SIDE[f.aColor]||SIDE.blue,SIDE[f.bColor]||SIDE.red];
    o.fillStyle='#07070b';o.fillRect(0,0,TW,TH);
    o.save();o.translate(0,150);renderSplit(o,post,imgs,th,{...f,tag:''},1330);o.restore();
    const g=o.createLinearGradient(0,1300,0,TH);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.9)');o.fillStyle=g;o.fillRect(0,1300,TW,TH-1300);
    L.content=null;return L;
  }
  const img=imgs.photo;const ph=(img&&post.photo)?post.photo:null;
  SHADOW=!!ph;T[tpl]?T[tpl](cx,f,th,!!ph,H):T.headline(cx,f,th,!!ph,H);SHADOW=false;
  let used=H;try{const sm=cnv(108,135);const sx=sm.getContext('2d');sx.drawImage(content,0,0,108,135);const dd=sx.getImageData(0,0,108,135).data;used=0;
    for(let yy=134;yy>=0&&!used;yy--)for(let xx=0;xx<108;xx++)if(dd[(yy*108+xx)*4+3]>20){used=(yy+1)*10;break}}catch(err){used=H}
  // animated versions of the content for the Studio video: numbers count up, scores roll
  if(tpl==='stat'||tpl==='result'){
    const cache={};const mk=(ff)=>{const key=JSON.stringify([ff.big,ff.hs,ff.as]);if(cache[key])return cache[key];const c=cnv(W,H);const x=c.getContext('2d');SHADOW=!!ph;T[tpl](x,ff,th,!!ph,H);SHADOW=false;cache[key]=c;return c};
    if(tpl==='stat'){const m=String(f.big||'').match(/^(\D*?)([\d][\d,]*(?:\.\d+)?)(.*)$/);
      if(m){const _bs=fit(cnv(10,10).getContext('2d'),String(f.big),ANTON,940,ph?210:300);const num=parseFloat(m[2].replace(/,/g,''));const dec=(m[2].split('.')[1]||'').length;const commas=m[2].indexOf(',')>=0;
        L.contentAt=t=>{if(!isFinite(t)||t>=1500)return content;const v=num*ease((t-300)/1200);let s=v.toFixed(dec);if(commas)s=Number(s).toLocaleString('en-GB',{minimumFractionDigits:dec,maximumFractionDigits:dec});return mk({...f,big:m[1]+s+m[3],_bs})}}}
    else{const hs=parseInt(f.hs,10),as=parseInt(f.as,10);
      if(isFinite(hs)&&isFinite(as))L.contentAt=t=>{if(!isFinite(t)||t>=1700)return content;const e=Math.max(0,Math.min(1,(t-300)/1400));return mk({...f,hs:Math.floor(hs*e),as:Math.floor(as*e)})}}
  }
  const qTopTT=TT.y+H*TT.s+22;const CY=TT.y+Math.max(0,Math.min(420,qTopTT-40-(TT.y+used*TT.s)));L.cy=CY;
  if(ph){
    const cut=ph.cut!=null?ph.cut:isCutout(img);const left=!!LEFT[tpl];
    const band=BAND[tpl]||500;const tx=left?700:540,ty=left?Math.min(900,CY+470):CY+band*TT.s*0.47,fh=left?430:band*TT.s*0.56;
    const oc=cnv(TW,TH);const x=oc.getContext('2d');
    if(cut){const p=place(img,ph.focus,tx,ty,fh,TW,TH,false,ph);glowBehind(x,img,p,th);graded(x,img,p);fadeBottom(x,Math.min(TH,p.y+p.h),200)}
    else if(left){graded(x,img,place(img,ph.focus,tx,ty,fh,TW,TH,true,ph));x.save();x.globalCompositeOperation='soft-light';x.fillStyle=rgb(th.glow,.55);x.fillRect(0,0,TW,TH);x.restore()}
    else{const ah=Math.round(CY+band*TT.s+160);const pc=cnv(TW,ah);const px=pc.getContext('2d');graded(px,img,place(img,ph.focus,540,ah*0.46,ah*0.42,TW,ah,true,ph));
      px.save();px.globalCompositeOperation='soft-light';px.fillStyle=rgb(th.glow,.55);px.fillRect(0,0,TW,ah);px.restore();fadeBottom(px,ah,260);x.drawImage(pc,0,0)}
    o.drawImage(oc,0,0);
    let g=o.createLinearGradient(0,0,0,420);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=g;o.fillRect(0,0,TW,420);
    const d=mix(th,.85);
    if(left){g=o.createLinearGradient(0,0,TW,0);g.addColorStop(0,rgb(d,.92));g.addColorStop(.4,rgb(d,.75));g.addColorStop(.66,rgb(d,0));o.fillStyle=g;o.fillRect(0,0,TW,TH)}
    else{const y0=CY+band*TT.s*0.55,y1=CY+band*TT.s+40;g=o.createLinearGradient(0,y0,0,y1);g.addColorStop(0,rgb(d,0));g.addColorStop(1,rgb(d,.92));o.fillStyle=g;o.fillRect(0,y0,TW,y1-y0);o.fillStyle=rgb(d,.92);o.fillRect(0,y1,TW,TH-y1)}
    g=o.createLinearGradient(0,1300,0,TH);g.addColorStop(0,rgb(d,0));g.addColorStop(1,rgb(d,.97));o.fillStyle=g;o.fillRect(0,1300,TW,TH-1300);
  }
  return L;
}
function ease(t){t=Math.max(0,Math.min(1,t));return 1-Math.pow(1-t,3)}
function back(t){t=Math.max(0,Math.min(1,t));const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)}
function composeTT(ctx,L,t){ // t in ms; t=Infinity -> final still
  const D=7000;const done=!isFinite(t);
  const z=done?1:1+0.07*(t/D);ctx.save();ctx.translate(TW/2,TH*0.42);ctx.scale(z,z);ctx.translate(-TW/2,-TH*0.42);ctx.drawImage(L.bg,0,0);ctx.restore();
  if(L.brand){ctx.globalAlpha=done?1:ease(t/400);ctx.drawImage(L.brand,0,140);ctx.globalAlpha=1}
  if(L.content){const a=done?1:ease((t-250)/450),dy=done?0:(1-back((t-250)/600))*90;
    ctx.globalAlpha=a;ctx.drawImage(L.contentAt?L.contentAt(t):L.content,TT.x,(L.cy||TT.y)+dy,W*TT.s,H*TT.s);ctx.globalAlpha=1}
  if(L.q&&L.q.h){const top=TT.y+H*TT.s+22;const a=done?1:ease((t-1150)/300),dy=done?0:(1-back((t-1150)/500))*180;
    const pul=done?1:(t>3600&&t<4200?1+0.035*Math.sin((t-3600)/600*Math.PI):1);
    ctx.save();ctx.globalAlpha=a;ctx.translate(TW/2,top+dy+L.q.h/2);ctx.scale(pul,pul);ctx.translate(-TW/2,-L.q.h/2);ctx.drawImage(L.q.c,0,0);ctx.restore()}
  if(!done&&t>250&&t<500){ctx.fillStyle='rgba(255,255,255,'+(0.28*(1-(t-250)/250))+')';ctx.fillRect(0,0,TW,TH)}
}
function renderTikTok(c,post,imgs,slide){c.width=TW;c.height=TH;composeTT(c.getContext('2d'),ttLayers(post,imgs,slide),Infinity)}
async function recordTikTok(post,imgs,onProgress){
  if(!window.MediaRecorder)throw new Error('This browser can’t record video. Try Chrome or Safari.');
  const types=['video/mp4;codecs=avc1.42E01E','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  const type=types.find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}});if(!type)throw new Error('This browser can’t record video. Try Chrome or Safari.');
  const L=ttLayers(post,imgs,0);const c=cnv(TW,TH);const ctx=c.getContext('2d');composeTT(ctx,L,0);
  const stream=c.captureStream(30);const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:8000000});const chunks=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r);
  rec.start(250);const D=7000;const t0=performance.now();
  await new Promise(res=>{const step=()=>{const t=performance.now()-t0;composeTT(ctx,L,Math.min(t,D));onProgress&&onProgress(Math.min(1,t/D));if(t<D+150)requestAnimationFrame(step);else res()};step()});
  rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  return {blob:new Blob(chunks,{type:type.split(';')[0]}),ext:type.indexOf('mp4')>=0?'mp4':'webm'};
}

