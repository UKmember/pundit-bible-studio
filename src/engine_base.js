const W=1080,H=1350;
const GOLD='#f5c518',WHITE='#ffffff',OFF='#e1e1e6',RED='#e6282d',GREY='#9696a0';
const THEMES={
  brand:{c1:[10,44,120],c2:[2,10,34],glow:[40,100,220],accent:'#8fb8ff'},
  red:{c1:[70,8,12],c2:[12,6,8],glow:[150,24,30],accent:GOLD},
  maroon:{c1:[40,10,10],c2:[8,4,4],glow:[160,24,24],accent:GOLD},
  charcoal:{c1:[20,20,26],c2:[6,6,8],glow:[110,14,18],accent:GOLD},
  navy:{c1:[18,22,48],c2:[5,6,14],glow:[50,64,150],accent:GOLD},
  sky:{c1:[20,60,95],c2:[6,14,26],glow:[60,150,210],accent:'#8ccdfa',tag:'#6cabdd',tagText:'#08141f'},
  green:{c1:[25,55,35],c2:[6,14,9],glow:[40,130,64],accent:GOLD},
  england:{c1:[10,22,60],c2:[4,6,18],glow:[170,24,34],accent:GOLD},
  purple:{c1:[40,15,60],c2:[8,4,14],glow:[120,44,170],accent:GOLD}
};
const THEME_ORDER=['brand','red','navy','charcoal','maroon','sky','green','england','purple'];
const COL={white:WHITE,gold:GOLD,red:RED,grey:GREY,off:OFF};
function col(c,th){ if(!c) return WHITE; if(c==='accent') return th.accent; return COL[c]||c; }
const LEFT={quote:1,headline:1,list:1};
const BAND={stat:560,versus:600,poll:560,ranking:520,result:470,ratings:440};

const SCHEMA={
  quote:[['tag','text','Label'],['quote','lines','Quote (one line per row)'],['speaker','text','Who said it'],['context','text','Context line'],['question','text','Question bar']],
  headline:[['tag','text','Label'],['lines','rows','Big lines','TEXT | colour (white, gold, red, accent)',['t','c']],['body','text','Small text'],['question','text','Question bar']],
  stat:[['tag','text','Label'],['label','text','Above the number'],['big','text','Big number'],['rows','rows','Rows','LABEL | VALUE | colour',['label','value','c']],['question','text','Question bar']],
  list:[['tag','text','Label'],['title','text','Title'],['items','lines','Names (one per row)'],['body','text','Small text'],['question','text','Question bar']],
  versus:[['tag','text','Label'],['title1','text','Title line 1'],['title2','text','Title line 2'],['home','text','Home team'],['homeSub','text','Home note'],['away','text','Away team'],['awaySub','text','Away note'],['info','text','Date / time / venue'],['question','text','Question bar']],
  poll:[['tag','text','Label'],['title1','text','Title line 1'],['title2','text','Title line 2'],['options','rows','Options','NAME | SMALL TEXT',['name','sub']],['question','text','Question bar']],
  ranking:[['tag','text','Label'],['title1','text','Title line 1'],['title2','text','Title line 2'],['rows','rows','Rows','TEAM | hi (to highlight)',['name','hi']],['body','text','Small text'],['question','text','Question bar']],
  result:[['tag','text','Label (competition)'],['home','text','Home team'],['hs','text','Home score'],['away','text','Away team'],['as','text','Away score'],['homeScorers','lines','Home scorers (one per row)'],['awayScorers','lines','Away scorers (one per row)'],['question','text','Question bar']],
  split:[['tag','text','Label'],['title','text','Title'],['aName','text','A: name'],['aSub','text','A: club / note'],['aColor','text','A: colour (red, blue, sky, navy, white, gold, green, black, orange, purple, claret)'],['bName','text','B: name'],['bSub','text','B: club / note'],['bColor','text','B: colour'],['question','text','Question bar']],
  ratings:[['tag','text','Label'],['title','text','Title'],['subtitle','text','Match line'],['rows','rows','Players','NAME | SCORE',['name','score']],['question','text','Question bar']],
  goal:[['tag','text','Label (competition)'],['scorer','text','Scorer'],['minute','text','Minute'],['home','text','Home team'],['hs','text','Home score'],['away','text','Away team'],['as','text','Away score'],['question','text','Question bar']],
  guess:[['tag','text','Label'],['clues','lines','Clues (one per row)'],['answer','text','Answer'],['answerLine','text','Answer slide: small line'],['question','text','Quiz question bar'],['revealQuestion','text','Answer slide question bar']],
  h2h:[['tag','text','Label'],['aName','text','A: name'],['aColor','text','A: colour'],['bName','text','B: name'],['bColor','text','B: colour'],['rows','rows','Stats','LABEL | A VALUE | B VALUE | low (if lower is better)',['label','a','b','low']],['question','text','Question bar']],
  carousel:[['tag','text','Label'],['title','text','Cover title'],['items','rows','Slides','NAME | ONE LINE',['name','line']],['question','text','Question (cover + last slide)']]
};

// ---------- drawing helpers ----------
function F(w,s,fam){return w+' '+s+'px '+fam}
const ANTON=s=>F(400,s,'Anton'),BB=s=>F(700,s,'"Barlow Condensed"'),BM=s=>F(500,s,'"Barlow Condensed"');
let SHADOW=false;
function tw(ctx,t,font){ctx.font=font;return ctx.measureText(t).width}
function fit(ctx,t,fam,maxW,start,min){let s=start;min=min||20;while(s>min){if(tw(ctx,t,fam(s))<=maxW)return s;s-=2}return min}
function text(ctx,t,x,y,font,fill,align){
  ctx.font=font;ctx.fillStyle=fill;const m=ctx.measureText(t);const a=m.actualBoundingBoxAscent;let xx=x;
  if(align==='center')xx=x-m.width/2;if(align==='right')xx=x-m.width;
  if(SHADOW){ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=24;ctx.shadowOffsetY=4;ctx.fillText(t,xx,y+a);ctx.restore()}else ctx.fillText(t,xx,y+a);
  return a+m.actualBoundingBoxDescent}
function wrap(ctx,t,font,maxW){ctx.font=font;const words=String(t||'').split(/\s+/).filter(Boolean);const out=[];let cur='';for(const w of words){const tt=cur?cur+' '+w:w;if(ctx.measureText(tt).width<=maxW)cur=tt;else{if(cur)out.push(cur);cur=w}}if(cur)out.push(cur);return out}
function rgb(a,al){return 'rgba('+a[0]+','+a[1]+','+a[2]+','+(al==null?1:al)+')'}
function mix(th,t){return th.c1.map((v,i)=>Math.round(v*(1-t)+th.c2[i]*t))}
const U=s=>String(s==null?'':s).toUpperCase();

function background(ctx,th,bg){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,rgb(th.c1));g.addColorStop(1,rgb(th.c2));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(bg){const sc=Math.max(W/bg.width,H/bg.height);ctx.save();ctx.filter='saturate(1.1) contrast(1.05)';ctx.drawImage(bg,(W-bg.width*sc)/2,(H-bg.height*sc)/2,bg.width*sc,bg.height*sc);ctx.restore();
    const o=ctx.createLinearGradient(0,0,0,H);o.addColorStop(0,rgb(th.c2,.35));o.addColorStop(.55,rgb(th.c2,.55));o.addColorStop(1,rgb(th.c2,.9));ctx.fillStyle=o;ctx.fillRect(0,0,W,H);
    const l=ctx.createLinearGradient(0,0,W,0);l.addColorStop(0,rgb(th.c2,.6));l.addColorStop(.6,rgb(th.c2,0));ctx.fillStyle=l;ctx.fillRect(0,0,W,H);return}
  ctx.save();ctx.globalCompositeOperation='lighter';
  const r=ctx.createRadialGradient(760,420,0,760,420,720);r.addColorStop(0,rgb(th.glow,.45));r.addColorStop(1,rgb(th.glow,0));
  ctx.fillStyle=r;ctx.fillRect(0,0,W,H);ctx.restore();
  stripes(ctx,0,H,.035);
}
function stripes(ctx,y0,y1,a){ctx.save();ctx.beginPath();ctx.rect(0,y0,W,y1-y0);ctx.clip();ctx.strokeStyle='rgba(255,255,255,'+a+')';ctx.lineWidth=14;
  for(let i=-H;i<W+H;i+=46){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+H,H);ctx.stroke()}ctx.restore()}
function tag(ctx,x,y,t,th){if(!t)return;ctx.font=BB(34);const w=ctx.measureText(t).width;ctx.fillStyle=th.tag||RED;ctx.fillRect(x,y,w+36,56);const s=SHADOW;SHADOW=false;text(ctx,t,x+18,y+13,BB(34),th.tagText||WHITE);SHADOW=s}
// The question bar: big, bold and impossible to miss.
const QX=168,QPAD=30;
function qLayout(ctx,q,maxW){
  if(!q)return null;const t=U(q);maxW=maxW||W-QX-60;
  let s=fit(ctx,t,ANTON,maxW,80,56);
  if(tw(ctx,t,ANTON(s))<=maxW)return {lines:[t],size:s,lh:Math.round(s*1.08)};
  for(s=66;s>=46;s-=4){const ls=wrap(ctx,t,ANTON(s),maxW);if(ls.length<=2)return {lines:ls,size:s,lh:Math.round(s*1.08)}}
  const ls=wrap(ctx,t,ANTON(44),maxW).slice(0,3);return {lines:ls,size:44,lh:48};
}
function qLines(ctx,q){const L=qLayout(ctx,q);return L?L.lines:[]}
function qTop(ctx,q){const L=qLayout(ctx,q);return L?H-110-(QPAD*2+L.lh*L.lines.length):H-110}
function bubble(ctx,x,cy,sz){ // red speech bubble with three dots
  const w=sz*1.25,h=sz,r=sz*0.22,y=cy-h/2-sz*0.08;
  ctx.fillStyle=RED;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+w*0.42,y+h);ctx.lineTo(x+w*0.2,y+h+sz*0.28);ctx.lineTo(x+w*0.24,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill();
  ctx.fillStyle='#fff';[0.3,0.5,0.7].forEach(f=>{ctx.beginPath();ctx.arc(x+w*f,y+h/2,sz*0.08,0,Math.PI*2);ctx.fill()});
}
function qbar(ctx,q){const L=qLayout(ctx,q);if(!L)return;const top=qTop(ctx,q);const s=SHADOW;SHADOW=false;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,top,W,H-110-top);ctx.fillStyle=RED;ctx.fillRect(0,top,W,8);
  const bh=H-110-top;bubble(ctx,54,top+bh/2+4,Math.min(78,bh*0.5));
  let y=top+QPAD+(L.lh-L.size)/2+2;for(const l of L.lines){text(ctx,l,QX,y,ANTON(L.size),NAVY);y+=L.lh}SHADOW=s}
const NAVY='#031F60';
const LOGO=new Image();let LOGO_OK=false;LOGO.onload=()=>{LOGO_OK=true;if(window.__onLogo)window.__onLogo()};LOGO.src=LOGO_SRC;
function brand(ctx){
  ctx.fillStyle=NAVY;ctx.fillRect(0,H-110,W,110);
  const s=SHADOW;SHADOW=false;const d=92,bx=44,by=H-110+(110-d)/2;
  let x=bx;
  if(LOGO_OK){ctx.save();ctx.beginPath();ctx.arc(bx+d/2,by+d/2,d/2,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.clip();ctx.drawImage(LOGO,bx,by,d,d);ctx.restore();x=bx+d+22}
  const f=ANTON(46);ctx.font=f;const m=ctx.measureText('PUNDIT');const y=H-55-(m.actualBoundingBoxAscent)/2;const w1=m.width;
  text(ctx,'PUNDIT',x,y,f,WHITE);text(ctx,'BIBLE',x+w1+14,y,f,'#8fb8ff');
  text(ctx,'FOLLOW FOR DAILY TAKES',W-50,H-55-12,BB(28),'rgba(255,255,255,.75)','right');
  SHADOW=s;
}

// ---------- photo analysis + placement ----------
function small(img,w){const c=document.createElement('canvas');const s=w/img.width;c.width=w;c.height=Math.max(1,Math.round(img.height*s));const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);return {c,x}}
function isCutout(img){
  try{const {c,x}=small(img,64);const d=x.getImageData(0,0,c.width,c.height).data;let edge=0,clear=0;
    for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++){if(xx>1&&yy>1&&xx<c.width-2&&yy<c.height-2)continue;edge++;if(d[(yy*c.width+xx)*4+3]<200)clear++}
    return clear/edge>0.25}catch(e){return false}
}
function alphaFocus(img){
  try{const {c,x}=small(img,160);const d=x.getImageData(0,0,c.width,c.height).data;let t=c.height,b=0,l=c.width,r=0;
    for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++)if(d[(yy*c.width+xx)*4+3]>128){if(yy<t)t=yy;if(yy>b)b=yy;if(xx<l)l=xx;if(xx>r)r=xx}
    if(b<=t)return null;const bh=b-t;const band=Math.round(t+bh*0.3);let sx=0,n=0;
    for(let yy=t;yy<band;yy++)for(let xx=0;xx<c.width;xx++)if(d[(yy*c.width+xx)*4+3]>128){sx+=xx;n++}
    const cx=n?sx/n:(l+r)/2;const fh=Math.min(bh*0.36,(r-l)*0.6);const fw=fh*0.8;
    return {x:(cx-fw/2)/c.width,y:(t+bh*0.04)/c.height,w:fw/c.width,h:fh/c.height}}catch(e){return null}
}
const DEFAULT_FOCUS={x:.38,y:.12,w:.24,h:.3};
function place(img,focus,tcx,tcy,faceH,aw,ah,cover,adj){
  const iw=img.width,ih=img.height;const f=focus||DEFAULT_FOCUS;
  let s=faceH/Math.max(8,f.h*ih);const cs=Math.max(aw/iw,ah/ih);
  s*= (adj&&adj.zoom)||1; if(cover)s=Math.max(s,cs);
  const w=iw*s,h=ih*s;let x=tcx-(f.x+f.w/2)*iw*s+((adj&&adj.dx)||0),y=tcy-(f.y+f.h/2)*ih*s+((adj&&adj.dy)||0);
  if(cover){x=Math.min(0,Math.max(aw-w,x));y=Math.min(0,Math.max(ah-h,y))}
  return {x,y,w,h};
}
function graded(ctx,img,p){ctx.save();ctx.filter='contrast(1.1) saturate(1.15)';ctx.drawImage(img,p.x,p.y,p.w,p.h);ctx.restore()}

// photo filling the whole card area, subject on the right, dark fade on the left for text
function photoLeftBleed(ctx,img,ph,th,area){
  const oc=document.createElement('canvas');oc.width=W;oc.height=area;const o=oc.getContext('2d');
  o.fillStyle=rgb(th.c2);o.fillRect(0,0,W,area);
  graded(o,img,place(img,ph.focus,770,Math.min(470,area*0.42),330,W,area,true,ph));
  const d=mix(th,.85);
  let g=o.createLinearGradient(0,0,W,0);g.addColorStop(0,rgb(d,.95));g.addColorStop(.36,rgb(d,.82));g.addColorStop(.62,rgb(d,0));o.fillStyle=g;o.fillRect(0,0,W,area);
  g=o.createLinearGradient(0,0,0,240);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=g;o.fillRect(0,0,W,240);
  g=o.createLinearGradient(0,area-300,0,area);g.addColorStop(0,rgb(d,0));g.addColorStop(1,rgb(d,.96));o.fillStyle=g;o.fillRect(0,area-300,W,300);
  tint(o,th,area);ctx.drawImage(oc,0,0);
}
// cut-out subject standing on the right with a coloured glow behind
function photoLeftCut(ctx,img,ph,th,area){
  const p=place(img,ph.focus,780,Math.min(450,area*0.4),300,W,area,false,ph);
  const oc=document.createElement('canvas');oc.width=W;oc.height=area;const o=oc.getContext('2d');
  glowBehind(o,img,p,th);graded(o,img,p);
  fadeBottom(o,area,130);ctx.drawImage(oc,0,0);
  const sh=ctx.createLinearGradient(0,0,560,0);sh.addColorStop(0,'rgba(0,0,0,.5)');sh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sh;ctx.fillRect(0,0,560,area);
}
// photo band across the top for structured cards
function photoBand(ctx,img,ph,th,band,cut){
  const oc=document.createElement('canvas');oc.width=W;oc.height=band;const o=oc.getContext('2d');
  if(cut){const p=place(img,ph.focus,560,band*0.46,band*0.42,W,band,false,ph);glowBehind(o,img,p,th);graded(o,img,p)}
  else{graded(o,img,place(img,ph.focus,540,band*0.47,band*0.36,W,band,true,ph));tint(o,th,band)}
  let g=o.createLinearGradient(0,0,0,200);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=g;o.fillRect(0,0,W,200);
  g=o.createLinearGradient(0,band*0.5,0,band);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');o.fillStyle=g;o.fillRect(0,band*0.5,W,band*0.5);
  fadeBottom(o,band,band*0.42);
  ctx.drawImage(oc,0,0);
}
function tint(o,th,h){o.save();o.globalCompositeOperation='soft-light';o.fillStyle=rgb(th.glow,.55);o.fillRect(0,0,W,h);o.restore();
  const v=o.createRadialGradient(W*0.6,h*0.4,h*0.25,W*0.6,h*0.4,h*0.95);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');o.fillStyle=v;o.fillRect(0,0,W,h)}
function glowBehind(o,img,p,th){
  const g=document.createElement('canvas');g.width=W;g.height=o.canvas.height;const gx=g.getContext('2d');
  gx.drawImage(img,p.x,p.y,p.w,p.h);gx.globalCompositeOperation='source-in';gx.fillStyle=th.accent===GOLD?rgb(th.glow):th.accent;gx.fillRect(0,0,W,g.height);
  o.save();o.filter='blur(38px)';o.globalAlpha=.9;o.drawImage(g,0,0);o.drawImage(g,0,0);o.restore();
}
function fadeBottom(o,h,len){o.save();o.globalCompositeOperation='destination-out';const g=o.createLinearGradient(0,h-len,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');o.fillStyle=g;o.fillRect(0,h-len,W,len);o.restore()}

// ---------- templates (text-only and photo versions) ----------
const T={};
T.quote=function(ctx,f,th,ph){
  const colW=ph?440:W-140;tag(ctx,70,70,f.tag,th);
  text(ctx,'“',60,150,ANTON(280),th.accent);
  const lines=(f.quote||[]).map(U);let s=ph?150:175;for(const l of lines)s=Math.min(s,fit(ctx,l,ANTON,colW,s,60));
  let y=380;lines.forEach((l,i)=>{text(ctx,l,70,y,ANTON(s),(i===lines.length-1&&f.highlightLast!==false)?th.accent:WHITE);y+=s*1.04});
  ctx.fillStyle=RED;ctx.fillRect(70,y+20,130,8);
  text(ctx,U(f.speaker),70,y+55,BB(58),WHITE);
  wrap(ctx,f.context,BM(36),colW).forEach((l,i)=>text(ctx,l,70,y+125+i*42,BM(36),OFF));
};
T.headline=function(ctx,f,th,ph){
  const colW=ph?480:W-140;tag(ctx,70,70,f.tag,th);let y=ph?210:190;
  for(const ln of (f.lines||[])){const t=U(ln.t);const s=fit(ctx,t,ANTON,colW,ln.s||(ph?170:200),50);text(ctx,t,70,y,ANTON(s),col(ln.c,th));y+=s*1.02+12}
  wrap(ctx,f.body,BM(38),colW).forEach((l,i)=>text(ctx,l,70,y+30+i*46,BM(38),OFF));
};
T.list=function(ctx,f,th,ph){
  const colW=ph?520:W-140;tag(ctx,70,70,f.tag,th);
  const t=U(f.title);text(ctx,t,70,160,ANTON(fit(ctx,t,ANTON,colW,260)),col(f.titleColor||'red',th));
  let y=480;const items=f.items||[];const s=items.length>5?56:68;
  for(const n of items){ctx.fillStyle=RED;ctx.fillRect(70,y,14,s+2);const t2=U(n);text(ctx,t2,110,y+6,ANTON(fit(ctx,t2,ANTON,colW-40,s)),WHITE);y+=s+34}
  wrap(ctx,f.body,BM(38),colW).forEach((l,i)=>text(ctx,l,70,y+10+i*46,BM(38),OFF));
};
T.stat=function(ctx,f,th,ph,qt){
  tag(ctx,70,70,f.tag,th);const rows=f.rows||[];
  if(!ph){
    text(ctx,U(f.label),70,170,BB(60),th.accent);
    const big=String(f.big||'');const bsz=f._bs||fit(ctx,big,ANTON,940,300);text(ctx,big,66,245,ANTON(bsz),WHITE);
    let y=640;const st=Math.min(165,(qt-30-y)/Math.max(1,rows.length));for(const r of rows){line(ctx,y);text(ctx,U(r.label),70,y+st*0.26,BB(Math.min(56,st*0.36)),OFF);const v=String(r.value||'');text(ctx,v,W-70,y+st*0.14,ANTON(fit(ctx,v,ANTON,380,Math.min(110,st*0.68))),col(r.c||'red',th),'right');y+=st}
    line(ctx,y);return}
  const band=BAND.stat;text(ctx,U(f.label),70,band-50,BB(54),th.accent);
  const big=String(f.big||'');const bs=f._bs||fit(ctx,big,ANTON,940,210);const bh=text(ctx,big,66,band+10,ANTON(bs),WHITE);
  let y=band+10+bh+40;const step=Math.min(112,(qt-20-y)/Math.max(1,rows.length));
  for(const r of rows){line(ctx,y);text(ctx,U(r.label),70,y+step*0.3,BB(Math.min(50,step*0.45)),OFF);const v=String(r.value||'');text(ctx,v,W-70,y+step*0.16,ANTON(fit(ctx,v,ANTON,380,Math.min(90,step*0.72))),col(r.c||'red',th),'right');y+=step}
  line(ctx,y);
};
function line(ctx,y){ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(70,y,W-140,2)}
T.versus=function(ctx,f,th,ph){
  tag(ctx,70,70,f.tag,th);
  const teams=[[f.home,f.homeSub,'#ffffff','#0a1432',RED],[f.away,f.awaySub,'#c8141e','#ffffff','#ffffff']];
  let bt,bh,infoY;
  if(!ph){text(ctx,U(f.title1),W/2,180,ANTON(150),WHITE,'center');text(ctx,U(f.title2),W/2,340,ANTON(150),th.accent,'center');bt=560;bh=340;infoY=950}
  else{const a=U(f.title1)+' ',b=U(f.title2);const s=fit(ctx,a+b,ANTON,W-140,120);const wa=tw(ctx,a,ANTON(s)),wb=tw(ctx,b,ANTON(s));const x=(W-wa-wb)/2;
    text(ctx,a,x,BAND.versus-70,ANTON(s),WHITE);text(ctx,b,x+wa,BAND.versus-70,ANTON(s),th.accent);bt=BAND.versus+90;bh=260;infoY=bt+bh+40}
  teams.forEach((t,i)=>{const x0=70+i*500;ctx.fillStyle=t[2];ctx.fillRect(x0,bt,440,bh);const sh=SHADOW;SHADOW=false;
    const name=U(t[0]);text(ctx,name,x0+220,bt+(ph?28:40),ANTON(fit(ctx,name,ANTON,380,ph?80:90)),t[3],'center');
    text(ctx,'?',x0+220,bt+(ph?110:160),ANTON(ph?100:130),t[3],'center');
    const sub=U(t[1]);text(ctx,sub,x0+220,bt+bh-44,BB(fit(ctx,sub,BB,400,30)),t[4],'center');SHADOW=sh});
  text(ctx,'v',W/2,bt+bh/2-35,ANTON(80),th.accent,'center');
  const info=U(f.info);text(ctx,info,W/2,infoY,BB(fit(ctx,info,BB,W-140,50)),WHITE,'center');
};
T.poll=function(ctx,f,th,ph){
  tag(ctx,70,70,f.tag,th);let y0,oh,gap;
  if(!ph){text(ctx,U(f.title1),W/2,170,ANTON(170),WHITE,'center');text(ctx,U(f.title2),W/2,360,ANTON(170),RED,'center');y0=590;oh=200;gap=30}
  else{const a=U(f.title1)+' ',b=U(f.title2);const s=fit(ctx,a+b,ANTON,W-140,130);const wa=tw(ctx,a,ANTON(s)),wb=tw(ctx,b,ANTON(s));const x=(W-wa-wb)/2;
    text(ctx,a,x,BAND.poll-80,ANTON(s),WHITE);text(ctx,b,x+wa,BAND.poll-80,ANTON(s),RED);y0=BAND.poll+90;oh=170;gap=20}
  const L='ABCD';(f.options||[]).slice(0,4).forEach((o,i)=>{
    const cx=i%2,ry=Math.floor(i/2);const x0=70+cx*480,yy=y0+ry*(oh+gap);
    ctx.fillStyle='rgba(20,8,8,.92)';ctx.fillRect(x0,yy,450,oh);ctx.strokeStyle='#782020';ctx.lineWidth=3;ctx.strokeRect(x0,yy,450,oh);
    ctx.fillStyle=RED;ctx.fillRect(x0,yy,80,oh);const sh=SHADOW;SHADOW=false;text(ctx,L[i],x0+40,yy+oh/2-36,ANTON(70),WHITE,'center');
    const n=U(o.name);text(ctx,n,x0+105,yy+oh*0.2,ANTON(fit(ctx,n,ANTON,320,ph?64:72)),WHITE);
    const sb=U(o.sub);text(ctx,sb,x0+105,yy+oh*0.66,BB(fit(ctx,sb,BB,320,ph?32:36)),GOLD);SHADOW=sh;
  });
};
T.ranking=function(ctx,f,th,ph){
  tag(ctx,70,70,f.tag,th);const t1=U(f.title1),t2=U(f.title2);let y,rh,gap,fs;
  if(!ph){text(ctx,t1,70,170,ANTON(fit(ctx,t1,ANTON,W-140,140)),WHITE);text(ctx,t2,70,320,ANTON(fit(ctx,t2,ANTON,W-140,100)),th.accent);y=470;rh=110;gap=20;fs=72}
  else{const b=BAND.ranking;text(ctx,t1,70,b-100,ANTON(fit(ctx,t1,ANTON,W-140,100)),WHITE);text(ctx,t2,70,b+10,ANTON(fit(ctx,t2,ANTON,W-140,70)),th.accent);y=b+110;rh=82;gap=14;fs=56}
  (f.rows||[]).slice(0,5).forEach((r,i)=>{
    const hi=!!(r.hi&&String(r.hi).trim()&&String(r.hi).trim()!=='no');const c=hi?GOLD:WHITE;const sh=SHADOW;SHADOW=false;
    ctx.fillStyle=hi?'rgba(40,34,5,.92)':'rgba(0,0,0,.85)';ctx.fillRect(70,y,W-140,rh);
    ctx.fillStyle=c;ctx.fillRect(70,y,rh,rh);text(ctx,String(i+1),70+rh/2,y+rh*0.17,ANTON(fs),'#0a0a0c','center');
    text(ctx,U(r.name),70+rh+35,y+rh*0.18,ANTON(fs),c);SHADOW=sh;y+=rh+gap});
  wrap(ctx,f.body,BM(36),W-140).forEach((l,i)=>text(ctx,l,70,y+8+i*44,BM(36),OFF));
};

