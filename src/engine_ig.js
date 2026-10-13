
// ================= Instagram-style cards: story, post, bigquote, number =================
// Sentence-case headlines with gold highlights, full-bleed photo fading to black, optional circle photo, source credit.
const IG_TPL={story:1,post:1,bigquote:1,number:1};
const XB=s=>F(800,s,'Barlow'),XM=s=>F(600,s,'Barlow');
SCHEMA.story=[['headline','text','Headline (put *stars* round the words to show in gold)'],['source','text','Source (e.g. BBC Sport)']];
SCHEMA.post=[['name','text','Name on the post'],['handle','text','@handle'],['text','text','What they posted (a real post, word for word)'],['source','text','Source line (optional)']];
SCHEMA.bigquote=[['quote','text','The quote (word for word)'],['by','text','Gold line, e.g. ROY KEANE ON HIS BIGGEST PET PEEVE']];
SCHEMA.number=[['big','text','Big number, e.g. 1,327 DAYS'],['text','text','Line under it'],['source','text','Source (optional)']];
Object.assign(TPL_NAME,{story:'Story card',post:'Post reaction',bigquote:'Big quote',number:'Big number'});

// words with *highlights* -> lines of coloured words
function richLines(ctx,t,font,maxW){ctx.font=font;const words=[];let hi=false;
  String(t||'').replace(/\s+/g,' ').trim().split(' ').forEach(w=>{const m=w.match(/^(["“'‘(]*)(\*?)(.*?)(\*?)([.,!?;:’'”")]*)$/)||['',w,'','',''];let h=hi;if(m[2])h=true;const s=m[1]+m[3].replace(/\*/g,'')+m[5];if(s)words.push({w:s,hi:h});hi=m[4]?false:h});
  const sp=ctx.measureText(' ').width;const lines=[];let cur=[],cw=0;
  for(const x of words){const ww=ctx.measureText(x.w).width;if(cur.length&&cw+sp+ww>maxW){lines.push(cur);cur=[];cw=0}cur.push({...x,width:ww});cw+=(cur.length>1?sp:0)+ww}
  if(cur.length)lines.push(cur);return {lines,sp}}
function richFit(ctx,t,maxW,maxH,start,min,lh){for(let s=start;s>=min;s-=4){const r=richLines(ctx,t,XB(s),maxW);if(r.lines.length*s*lh<=maxH)return {...r,size:s}}const r=richLines(ctx,t,XB(min),maxW);return {...r,size:min}}
function drawRich(ctx,r,x,y,lh,accent,align){r.lines.forEach((ln,i)=>{const total=ln.reduce((a,b,j)=>a+b.width+(j?r.sp:0),0);let cx=align==='center'?x-total/2:x;
  ctx.font=XB(r.size);const base=y+i*r.size*lh+r.size*0.8;
  ln.forEach(wd=>{ctx.fillStyle=wd.hi?accent:WHITE;if(SHADOW){ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=22;ctx.shadowOffsetY=4;ctx.fillText(wd.w,cx,base);ctx.restore()}else ctx.fillText(wd.w,cx,base);cx+=wd.width+r.sp})})}

function igPhoto(ctx,img,ph,th,areaH,faceY,faceH){
  if(!img)return false;const cut=ph.cut!=null?ph.cut:isCutout(img);
  const oc=document.createElement('canvas');oc.width=W;oc.height=areaH;const o=oc.getContext('2d');
  if(cut){const p=place(img,ph.focus,W*0.66,faceY,faceH*1.05,W,areaH,false,ph);glowBehind(o,img,p,th);graded(o,img,p)}
  else graded(o,img,place(img,ph.focus,W*0.62,faceY,faceH,W,areaH,true,ph));
  fadeBottom(o,areaH,areaH*0.38);ctx.drawImage(oc,0,0);return cut}
function igCircle(ctx,img,ph,cx,cy,r,accent){if(!img)return;ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.closePath();ctx.fillStyle='#111';ctx.fill();ctx.clip();
  const p=place(img,ph&&ph.focus,cx,cy-r*0.1,r*0.9,r*2,r*2,false,ph);const sc=Math.max((r*2)/img.width,(r*2)/img.height);
  if(!(ph&&ph.focus)){ctx.drawImage(img,cx-img.width*sc/2,cy-img.height*sc/2,img.width*sc,img.height*sc)}else{graded(ctx,img,p)}
  ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.lineWidth=9;ctx.strokeStyle=accent;ctx.stroke()}
function igDark(ctx,from,to){const g=ctx.createLinearGradient(0,from,0,to);g.addColorStop(0,'rgba(4,6,14,0)');g.addColorStop(.45,'rgba(4,6,14,.82)');g.addColorStop(1,'rgba(4,6,14,.97)');ctx.fillStyle=g;ctx.fillRect(0,from,W,H-from)}
// Pundit Bible badge in the brand colours: navy pill, white logo disc, PUNDIT in white, BIBLE in brand blue
function igBrand(ctx,th){const s=SHADOW;SHADOW=false;const d=72,x=40,y=40,pad=10;
  ctx.font=ANTON(36);const tw1=Math.max(ctx.measureText('PUNDIT').width,ctx.measureText('BIBLE').width);const w=pad+d+14+tw1+22,h=d+pad*2;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=18;ctx.shadowOffsetY=4;ctx.fillStyle=NAVY;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,h/2);else ctx.rect(x,y,w,h);ctx.fill();ctx.restore();
  const lx=x+pad,ly=y+pad;ctx.save();ctx.beginPath();ctx.arc(lx+d/2,ly+d/2,d/2,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();if(LOGO_OK){ctx.clip();ctx.drawImage(LOGO,lx,ly,d,d)}ctx.restore();
  text(ctx,'PUNDIT',lx+d+14,ly+2,ANTON(36),WHITE);text(ctx,'BIBLE',lx+d+14,ly+38,ANTON(36),'#8fb8ff');SHADOW=s}
function igSource(ctx,src){if(!src)return;const s=SHADOW;SHADOW=false;ctx.font=XM(26);const a='Source | ';text(ctx,a,60,H-64,XM(26),'rgba(255,255,255,.8)');text(ctx,src,60+ctx.measureText(a).width,H-64,F('italic 700',26,'Barlow'),WHITE);SHADOW=s}
const igAccent=th=>th.accent===GOLD||!th.accent?GOLD:(th===THEMES.brand?GOLD:th.accent);

// Claude sometimes sends a field as {text:"..."} or a list instead of plain text: turn it back into words
function igStr(v){if(v==null)return '';if(typeof v==='string')return v;if(typeof v==='number'||typeof v==='boolean')return String(v);
  if(Array.isArray(v))return v.map(igStr).filter(Boolean).join(' ');
  if(typeof v.t==='string')return /gold|accent|yellow/i.test(v.c||'')?'*'+v.t+'*':v.t;
  for(const k of ['text','value','headline','quote','title','label','name'])if(typeof v[k]==='string')return v[k];
  return Object.values(v).map(igStr).filter(Boolean).join(' ')}
function renderIG(ctx,post,imgs,th,f){f=Object.fromEntries(Object.entries(f||{}).map(([k,v])=>[k,igStr(v)]));
  const acc=igAccent(th);const img=imgs.photo,img2=imgs.photo2;const ph=post.photo||{},ph2=post.photo2||{};const tpl=post.template;
  if(tpl==='story'){
    const cut=img?(ph.cut!=null?ph.cut:isCutout(img)):false;
    if(img2&&cut)igCircle(ctx,img2,ph2,330,470,245,acc);
    igPhoto(ctx,img,ph,th,H,420,360);
    if(img2&&!cut)igCircle(ctx,img2,ph2,250,450,190,acc);
    igDark(ctx,H*0.46,H);
    const r=richFit(ctx,f.headline||post.title||'',W-120,430,86,44,1.12);const top=H-(f.source?110:70)-r.lines.length*r.size*1.12;
    SHADOW=true;drawRich(ctx,r,60,top,1.12,acc,'left');SHADOW=false;igSource(ctx,f.source);igBrand(ctx,th);return}
  if(tpl==='bigquote'){
    igPhoto(ctx,img,ph,th,H*0.66,330,300);if(img2)igCircle(ctx,img2,ph2,300,380,215,acc);
    igDark(ctx,H*0.36,H);
    const by=U(f.by||'');const bys=by?fit(ctx,by,BB,W-120,52,30):0;
    const r=richFit(ctx,'“'+String(f.quote||'').replace(/^["“]|["”]$/g,'')+'”',W-130,470,68,38,1.14);
    const blockH=r.lines.length*r.size*1.14;const top=H-70-(by?bys+26:0)-blockH;
    // gold quote mark above
    const s=SHADOW;SHADOW=false;text(ctx,'“',W/2,top-150,ANTON(190),acc,'center');SHADOW=true;
    drawRich(ctx,r,W/2,top,1.14,acc,'center');SHADOW=false;if(by)text(ctx,by,W/2,H-60-bys,BB(bys),acc,'center');SHADOW=s;igBrand(ctx,th);return}
  if(tpl==='number'){
    igPhoto(ctx,img,ph,th,H*0.64,330,320);if(img2)igCircle(ctx,img2,ph2,290,360,200,acc);
    igDark(ctx,H*0.34,H);
    const big=String(f.big||'');const bs=fit(ctx,big,ANTON,W-110,190,80);
    const r=richFit(ctx,f.text||'',W-130,300,52,32,1.16);const blockH=r.lines.length*r.size*1.16;
    const bottom=H-(f.source?110:70);const ty=bottom-blockH;const by=ty-bs*1.12;
    SHADOW=true;text(ctx,big,W/2,by,ANTON(bs),acc,'center');drawRich(ctx,r,W/2,ty,1.16,acc,'center');SHADOW=false;igSource(ctx,f.source);igBrand(ctx,th);return}
  if(tpl==='post'){
    igPhoto(ctx,img,ph,th,H*0.82,380,340);if(img2)igCircle(ctx,img2,ph2,280,360,190,acc);
    igDark(ctx,H*0.34,H);
    // the post box
    const x=50,w=W-100;ctx.font=F(500,34,'Barlow');const body=wrap(ctx,f.text||'',F(500,34,'Barlow'),w-70);const lines=body.slice(0,9);
    const h=150+lines.length*46;const y=H-90-h;
    const s=SHADOW;SHADOW=false;ctx.fillStyle='#fff';ctx.fillRect(x,y,w,h);ctx.lineWidth=6;ctx.strokeStyle=acc;ctx.strokeRect(x,y,w,h);
    // avatar: initial in a circle (never a fake photo)
    const ini=String(f.name||'?').trim()[0]||'?';ctx.beginPath();ctx.arc(x+70,y+68,36,0,Math.PI*2);ctx.fillStyle=NAVY;ctx.fill();text(ctx,U(ini),x+70,y+46,ANTON(40),'#fff','center');
    text(ctx,f.name||'',x+122,y+36,F(700,32,'Barlow'),'#111');text(ctx,f.handle?('@'+String(f.handle).replace(/^@/,'')):'',x+122,y+74,F(400,28,'Barlow'),'#666');
    lines.forEach((l,i)=>text(ctx,l,x+35,y+128+i*46,F(500,34,'Barlow'),'#111'));
    SHADOW=s;igBrand(ctx,th);return}
}
