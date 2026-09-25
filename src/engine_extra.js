
// ---------- extra templates ----------
const SIDE={red:'#c8141e',blue:'#1c4fd6',sky:'#6cabdd',navy:'#132257',white:'#d9d9de',gold:'#e0b100',green:'#1f8a4c',black:'#1a1a1f',orange:'#f07d00',purple:'#5a2a8c',claret:'#7a1f3d'};
const TPL_NAME={goal:'Goal!',guess:'Guess the player',h2h:'Head to head',quote:'Hot quote',headline:'Headline',stat:'Stat shock',list:'List',versus:'Predictor',poll:'A/B/C/D poll',ranking:'Table',result:'Full-time result',split:"Who's better?",ratings:'Player ratings',carousel:'Carousel'};

T.result=function(ctx,f,th,ph,qt){
  tag(ctx,70,70,f.tag,th);
  const home=U(f.home),away=U(f.away),score=(String(f.hs==null?'':f.hs)+' – '+String(f.as==null?'':f.as));
  let y;
  const lab=U(f.label||'FULL TIME');
  if(!ph){text(ctx,lab,W/2,175,BB(60),th.accent,'center');y=260}
  else{const b=BAND.result;ctx.fillStyle=th.accent;ctx.font=BB(46);const w=ctx.measureText(lab).width;ctx.fillRect(W/2-w/2-22,b-110,w+44,64);const s=SHADOW;SHADOW=false;text(ctx,lab,W/2,b-98,BB(46),'#111','center');SHADOW=s;y=b-20}
  const ns=ph?100:140;
  y+=text(ctx,home,W/2,y,ANTON(fit(ctx,home,ANTON,W-140,ns)),WHITE,'center')+30;
  y+=text(ctx,score,W/2,y,ANTON(fit(ctx,score,ANTON,W-140,ph?190:280)),th.accent,'center')+36;
  y+=text(ctx,away,W/2,y,ANTON(fit(ctx,away,ANTON,W-140,ns)),WHITE,'center')+44;
  const hsL=(f.homeScorers||[]),asL=(f.awayScorers||[]);const n=Math.max(hsL.length,asL.length);
  const lh=Math.min(46,(qt-20-y)/Math.max(1,n));
  if(n&&lh>22){ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(70,y-18,W-140,2);
    for(let i=0;i<n;i++){if(hsL[i])text(ctx,U(hsL[i]),70,y+i*lh,BM(Math.min(38,lh*0.85)),OFF);if(asL[i])text(ctx,U(asL[i]),W-70,y+i*lh,BM(Math.min(38,lh*0.85)),OFF,'right')}}
};

T.ratings=function(ctx,f,th,ph,qt){
  tag(ctx,70,70,f.tag,th);const t=U(f.title);let y0;
  if(!ph){text(ctx,t,70,160,ANTON(fit(ctx,t,ANTON,W-140,130)),WHITE);text(ctx,U(f.subtitle),70,310,BB(46),th.accent);y0=390}
  else{const b=BAND.ratings;text(ctx,t,70,b-120,ANTON(fit(ctx,t,ANTON,W-140,100)),WHITE);text(ctx,U(f.subtitle),70,b-6,BB(42),th.accent);y0=b+64}
  const rows=(f.rows||[]).slice(0,12);const per=Math.ceil(rows.length/2)||1;const rh=Math.min(80,(qt-20-y0)/per);
  rows.forEach((r,i)=>{const c=i<per?0:1,k=i%per;const x0=70+c*480,y=y0+k*rh,w=460,h=rh-12;
    const sc=parseFloat(r.score);const bc=isNaN(sc)?GREY:sc>=8?'#2fa45a':sc>=6.5?GOLD:sc>=5?'#8a8a95':RED;
    const s=SHADOW;SHADOW=false;ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(x0,y,w,h);ctx.fillStyle=bc;ctx.fillRect(x0+w-h*1.25,y,h*1.25,h);
    const nm=U(r.name);text(ctx,nm,x0+18,y+h*0.2,ANTON(fit(ctx,nm,ANTON,w-h*1.25-36,h*0.6)),WHITE);
    text(ctx,String(r.score==null?'':r.score),x0+w-h*0.625,y+h*0.17,ANTON(h*0.62),bc===GOLD?'#111':'#fff','center');SHADOW=s});
};

function renderSplit(ctx,post,imgs,th,f,qt){
  const cols=[SIDE[f.aColor]||SIDE.blue,SIDE[f.bColor]||SIDE.red];
  [0,1].forEach(i=>{
    const oc=document.createElement('canvas');oc.width=540;oc.height=qt;const o=oc.getContext('2d');
    const g=o.createLinearGradient(0,0,0,qt);g.addColorStop(0,cols[i]);g.addColorStop(1,'#050507');o.fillStyle=g;o.fillRect(0,0,540,qt);
    const img=imgs[i?'photo2':'photo'];const ph=post[i?'photo2':'photo']||{};
    if(img){const cut=ph.cut!=null?ph.cut:isCutout(img);
      if(cut){const p=place(img,ph.focus,270,qt*0.36,300,540,qt,false,ph);graded(o,img,p);fadeBottom(o,qt,160)}
      else{graded(o,img,place(img,ph.focus,270,qt*0.36,300,540,qt,true,ph));o.save();o.globalCompositeOperation='soft-light';o.fillStyle=cols[i];o.globalAlpha=.55;o.fillRect(0,0,540,qt);o.restore()}}
    ctx.drawImage(oc,i*540,0);
  });
  let g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,'rgba(0,0,0,.65)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,300);
  g=ctx.createLinearGradient(0,qt-460,0,qt);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.94)');ctx.fillStyle=g;ctx.fillRect(0,qt-460,W,460);
  ctx.fillStyle=th.accent;ctx.fillRect(535,0,10,qt);
  tag(ctx,70,70,f.tag,th);
  SHADOW=true;const t=U(f.title);text(ctx,t,W/2,150,ANTON(fit(ctx,t,ANTON,W-140,120)),WHITE,'center');
  const cy=qt*0.5;ctx.beginPath();ctx.arc(540,cy,96,0,Math.PI*2);ctx.fillStyle=th.accent;ctx.fill();ctx.lineWidth=8;ctx.strokeStyle='#111';ctx.stroke();
  SHADOW=false;text(ctx,'VS',540,cy-50,ANTON(104),'#111','center');SHADOW=true;
  [[f.aName,f.aSub,'A',270],[f.bName,f.bSub,'B',810]].forEach(([n,s,l,cx])=>{
    const sv=SHADOW;SHADOW=false;ctx.fillStyle=th.accent;ctx.fillRect(cx-32,qt-330,64,64);text(ctx,l,cx,qt-320,ANTON(46),'#111','center');SHADOW=sv;
    const nm=U(n);text(ctx,nm,cx,qt-240,ANTON(fit(ctx,nm,ANTON,470,104)),WHITE,'center');
    const sb=U(s);if(sb)text(ctx,sb,cx,qt-110,BB(fit(ctx,sb,BB,470,40)),th.accent,'center')});
  SHADOW=false;
}


// ---------- GOAL! ----------
T.goal=function(ctx,f,th,ph,qt){
  const colW=ph?540:W-140;tag(ctx,70,70,f.tag,th);
  const g='GOAL!';const gs=fit(ctx,g,ANTON,colW,ph?250:300);let y=170;
  y+=text(ctx,g,66,y,ANTON(gs),th.accent)+34;
  const sc=U(f.scorer||'');const ss=fit(ctx,sc,ANTON,colW,ph?130:160);y+=text(ctx,sc,70,y,ANTON(ss),WHITE)+26;
  if(f.minute){const m=String(f.minute).replace(/[^0-9+]/g,'')+'′';ctx.fillStyle=RED;ctx.font=ANTON(64);const w=ctx.measureText(m).width;ctx.fillRect(70,y,w+40,90);const sv=SHADOW;SHADOW=false;text(ctx,m,90,y+12,ANTON(64),WHITE);SHADOW=sv;y+=90}
  const line=U(f.home)+'  '+(f.hs==null?'':f.hs)+'–'+(f.as==null?'':f.as)+'  '+U(f.away);
  const by=Math.max(y+40,qt-190);const sv=SHADOW;SHADOW=false;
  ctx.fillStyle='rgba(3,15,48,.88)';ctx.fillRect(70,by,colW,140);ctx.fillStyle=th.accent;ctx.fillRect(70,by,10,140);
  text(ctx,line,70+colW/2+5,by+36,ANTON(fit(ctx,line,ANTON,colW-60,76)),WHITE,'center');SHADOW=sv;
};
LEFT.goal=1;

// ---------- Guess the player ----------
BAND.guess=640;
function pixelate(o,img,ph,band,cut,th){
  const full=document.createElement('canvas');full.width=W;full.height=band;const fx=full.getContext('2d');
  const p=place(img,ph.focus,540,band*0.48,band*0.42,W,band,!cut,ph);fx.drawImage(img,p.x,p.y,p.w,p.h);
  if(cut){fx.globalCompositeOperation='source-in';fx.fillStyle='#050a18';fx.fillRect(0,0,W,band);
    o.save();o.filter='blur(30px)';o.globalAlpha=.9;const g=document.createElement('canvas');g.width=W;g.height=band;const gx=g.getContext('2d');gx.drawImage(img,p.x,p.y,p.w,p.h);gx.globalCompositeOperation='source-in';gx.fillStyle=th.accent;gx.fillRect(0,0,W,band);o.drawImage(g,0,0);o.restore();o.drawImage(full,0,0);return}
  const sm=document.createElement('canvas');sm.width=30;sm.height=Math.round(30*band/W);sm.getContext('2d').drawImage(full,0,0,sm.width,sm.height);
  o.save();o.imageSmoothingEnabled=false;o.drawImage(sm,0,0,W,band);o.restore();o.fillStyle='rgba(0,0,0,.25)';o.fillRect(0,0,W,band);
}
function renderGuess(ctx,post,imgs,th,f,qt,slide){
  const band=BAND.guess;const img=imgs.photo;const ph=post.photo||{};
  const oc=document.createElement('canvas');oc.width=W;oc.height=band;const o=oc.getContext('2d');
  if(img){const cut=ph.cut!=null?ph.cut:isCutout(img);
    if(slide===1){if(cut){const p=place(img,ph.focus,560,band*0.46,band*0.42,W,band,false,ph);glowBehind(o,img,p,th);graded(o,img,p)}else{graded(o,img,place(img,ph.focus,540,band*0.47,band*0.36,W,band,true,ph));tint(o,th,band)}}
    else pixelate(o,img,ph,band,cut,th)}
  let g=o.createLinearGradient(0,0,0,200);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=g;o.fillRect(0,0,W,200);
  fadeBottom(o,band,band*0.4);ctx.drawImage(oc,0,0);
  tag(ctx,70,70,f.tag||'GUESS THE PLAYER',th);
  if(slide!==1){SHADOW=true;
    ctx.save();ctx.globalAlpha=.9;text(ctx,'?',W/2,band*0.18,ANTON(360),th.accent,'center');ctx.restore();
    const a='GUESS THE ',b='PLAYER';const s=fit(ctx,a+b,ANTON,W-140,130);const wa=tw(ctx,a,ANTON(s)),wb=tw(ctx,b,ANTON(s));const x=(W-wa-wb)/2;
    text(ctx,a,x,band-90,ANTON(s),WHITE);text(ctx,b,x+wa,band-90,ANTON(s),th.accent);
    let y=band+60;SHADOW=false;const clues=(f.clues||[]).slice(0,4);const lh=Math.min(60,(qt-40-y)/Math.max(1,clues.length*1.6));
    clues.forEach((c,i)=>{ctx.fillStyle=th.accent;ctx.beginPath();ctx.arc(100,y+26,26,0,Math.PI*2);ctx.fill();text(ctx,String(i+1),100,y+8,ANTON(38),'#0a0a0c','center');
      const ls=wrap(ctx,c,BM(44),W-230).slice(0,2);ls.forEach((l,j)=>text(ctx,l,150,y+6+j*50,BM(44),WHITE));y+=Math.max(70,ls.length*50+24)});
  } else {SHADOW=true;
    text(ctx,'IT WAS…',W/2,band-40,BB(56),th.accent,'center');
    const n=U(f.answer||'');text(ctx,n,W/2,band+40,ANTON(fit(ctx,n,ANTON,W-140,170)),WHITE,'center');
    if(f.answerLine){SHADOW=false;wrap(ctx,f.answerLine,BM(42),W-180).slice(0,2).forEach((l,i)=>text(ctx,l,W/2,band+250+i*50,BM(42),OFF,'center'))}
  }
  SHADOW=false;
}

// ---------- Head to head ----------
BAND.h2h=520;
function num(v){const m=String(v==null?'':v).replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):0}
function renderH2H(ctx,post,imgs,th,f,qt){
  const band=BAND.h2h;const cols=[SIDE[f.aColor]||SIDE.red,SIDE[f.bColor]||SIDE.blue];
  [0,1].forEach(i=>{const oc=document.createElement('canvas');oc.width=540;oc.height=band;const o=oc.getContext('2d');
    const g=o.createLinearGradient(0,0,0,band);g.addColorStop(0,cols[i]);g.addColorStop(1,'#050507');o.fillStyle=g;o.fillRect(0,0,540,band);
    const img=imgs[i?'photo2':'photo'];const ph=post[i?'photo2':'photo']||{};
    if(img){const cut=ph.cut!=null?ph.cut:isCutout(img);if(cut){graded(o,img,place(img,ph.focus,270,band*0.42,band*0.4,540,band,false,ph))}else{graded(o,img,place(img,ph.focus,270,band*0.42,band*0.36,540,band,true,ph));o.save();o.globalCompositeOperation='soft-light';o.globalAlpha=.55;o.fillStyle=cols[i];o.fillRect(0,0,540,band);o.restore()}}
    fadeBottom(o,band,band*0.45);ctx.drawImage(oc,i*540,0)});
  let g=ctx.createLinearGradient(0,0,0,220);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,220);
  tag(ctx,70,70,f.tag||'HEAD TO HEAD',th);
  SHADOW=true;[[f.aName,270],[f.bName,810]].forEach(([n,cx])=>{const t=U(n);text(ctx,t,cx,band-120,ANTON(fit(ctx,t,ANTON,480,96)),WHITE,'center')});
  SHADOW=false;ctx.beginPath();ctx.arc(540,band-80,56,0,Math.PI*2);ctx.fillStyle=th.accent;ctx.fill();text(ctx,'VS',540,band-108,ANTON(58),'#0a0a0c','center');
  const rows=(f.rows||[]).slice(0,6);const top=band+20;const rh=Math.min(120,(qt-20-top)/Math.max(1,rows.length));const L=320;
  rows.forEach((r,i)=>{const y=top+i*rh;const a=num(r.a),b=num(r.b);const mx=Math.max(Math.abs(a),Math.abs(b),1e-9);
    const low=String(r.low||'').trim()!=='';const aw=low?a<b:a>b,bw=low?b<a:b>a;
    text(ctx,U(r.label),W/2,y+4,BB(Math.min(34,rh*0.3)),OFF,'center');
    const by=y+rh*0.38,bh=rh*0.4;const la=L*Math.abs(a)/mx,lb=L*Math.abs(b)/mx;
    ctx.globalAlpha=aw||a===b?1:.45;ctx.fillStyle=cols[0];ctx.fillRect(540-12-la,by,la,bh);ctx.globalAlpha=bw||a===b?1:.45;ctx.fillStyle=cols[1];ctx.fillRect(552,by,lb,bh);ctx.globalAlpha=1;
    const fs=Math.min(52,bh*1.1);const ta=String(r.a==null?'':r.a),tb=String(r.b==null?'':r.b);const wa=tw(ctx,ta,ANTON(fs)),wb=tw(ctx,tb,ANTON(fs));
    text(ctx,ta,Math.max(40+wa,540-12-la-14),by+bh/2-fs*0.38,ANTON(fs),aw?WHITE:OFF,'right');
    text(ctx,tb,Math.min(W-40-wb,552+lb+14),by+bh/2-fs*0.38,ANTON(fs),bw?WHITE:OFF);
  });
}
function slideCount(post){return post.template==='carousel'?carouselCount(post):post.template==='guess'?2:1}

function carouselCount(post){return ((post.fields&&post.fields.items)||[]).length+2}
function renderCarousel(ctx,post,imgs,th,f,slide){
  const items=f.items||[];const n=items.length;
  if(slide===0){
    const qt=qTop(ctx,f.question);const img=imgs.photo;const ph=post.photo||{};
    if(img){const cut=ph.cut!=null?ph.cut:isCutout(img);if(cut)photoLeftCut(ctx,img,ph,th,qt);else photoLeftBleed(ctx,img,ph,th,qt);SHADOW=true}
    tag(ctx,70,70,f.tag,th);const colW=img?520:W-140;
    const words=U(f.title);let s=img?150:180;let lines;
    for(;s>60;s-=6){lines=wrap(ctx,words,ANTON(s),colW);if(lines.length<=4&&lines.every(l=>tw(ctx,l,ANTON(s))<=colW))break}
    let y=200;lines.forEach((l,i)=>{text(ctx,l,70,y,ANTON(s),i===lines.length-1?th.accent:WHITE);y+=s*1.04});
    const sv=SHADOW;SHADOW=false;ctx.fillStyle=th.accent;ctx.fillRect(70,y+30,300,70);text(ctx,'SWIPE  →',90,y+46,BB(40),'#111');SHADOW=sv;
    SHADOW=false;qbar(ctx,f.question);return;
  }
  if(slide<=n){
    const it=items[slide-1]||{};stripes(ctx,0,H,.02);
    text(ctx,String(slide),W-60,40,ANTON(520),rgb(th.glow,.9),'right');
    tag(ctx,70,70,f.tag||U(f.title),th);
    const nm=U(it.name);let s=160,lines;for(;s>60;s-=6){lines=wrap(ctx,nm,ANTON(s),W-140);if(lines.length<=3&&lines.every(l=>tw(ctx,l,ANTON(s))<=W-140))break}
    let y=620;lines.forEach(l=>{text(ctx,l,70,y,ANTON(s),WHITE);y+=s*1.04});
    ctx.fillStyle=RED;ctx.fillRect(70,y+14,130,8);
    wrap(ctx,it.line,BM(48),W-140).slice(0,4).forEach((l,i)=>text(ctx,l,70,y+50+i*56,BM(48),OFF));
    text(ctx,slide+' / '+n,W-70,H-190,BB(40),GREY,'right');
    if(slide<n)text(ctx,'→',W-70,H-260,ANTON(70),th.accent,'right');
    return;
  }
  // last slide: the question
  tag(ctx,70,70,'YOUR SAY',th);
  const q=U(f.question||'Your pick?');let s=170,lines;for(;s>60;s-=6){lines=wrap(ctx,q,ANTON(s),W-140);if(lines.length<=4&&lines.every(l=>tw(ctx,l,ANTON(s))<=W-140))break}
  let y=H/2-lines.length*s*0.55-60;lines.forEach((l,i)=>{text(ctx,l,W/2,y,ANTON(s),i===lines.length-1?th.accent:WHITE,'center');y+=s*1.04});
  text(ctx,'TELL US IN THE COMMENTS',W/2,y+50,BB(50),OFF,'center');
}

function render(canvas,post,imgs,slide){
  imgs=imgs||{};slide=slide||0;
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
  const th=THEMES[post.theme]||THEMES.charcoal;const f=post.fields||{};
  const tpl=(T[post.template]||['split','carousel','guess','h2h'].includes(post.template))?post.template:'headline';
  background(ctx,th,imgs.bg);SHADOW=false;
  if(tpl==='carousel'){renderCarousel(ctx,post,imgs,th,f,slide);SHADOW=false;brand(ctx);return}
  if(tpl==='guess'&&slide===1){const f2={...f,question:f.revealQuestion||'Did you get it?'};const qt2=qTop(ctx,f2.question);renderGuess(ctx,post,imgs,th,f2,qt2,1);qbar(ctx,f2.question);brand(ctx);return}
  const qt=qTop(ctx,f.question);
  if(tpl==='guess'){renderGuess(ctx,post,imgs,th,f,qt,0)}
  else if(tpl==='h2h'){renderH2H(ctx,post,imgs,th,f,qt)}
  else if(tpl==='split'){renderSplit(ctx,post,imgs,th,f,qt)}
  else{
    const img=imgs.photo;const ph=(img&&post.photo)?post.photo:null;
    if(ph){const cut=ph.cut!=null?ph.cut:isCutout(img);
      if(LEFT[tpl]){if(cut)photoLeftCut(ctx,img,ph,th,qt);else photoLeftBleed(ctx,img,ph,th,qt)}
      else photoBand(ctx,img,ph,th,BAND[tpl],cut);
      SHADOW=true}
    T[tpl](ctx,f,th,!!ph,qt);
  }
  SHADOW=false;qbar(ctx,f.question);brand(ctx);
}

// other sizes: the 4:5 design on a blurred copy of itself
function exportCanvas(src,size){
  if(size==='feed')return src;
  const c=document.createElement('canvas');c.width=W;c.height=size==='story'?1920:1080;const x=c.getContext('2d');
  const sc=Math.max(c.width/W,c.height/H)*1.08;x.save();x.filter='blur(40px) brightness(.55)';x.drawImage(src,(c.width-W*sc)/2,(c.height-H*sc)/2,W*sc,H*sc);x.restore();
  if(size==='story'){x.drawImage(src,0,(1920-H)/2)}
  else{const s=1080/H;x.drawImage(src,(1080-W*s)/2,0,W*s,1080)}
  return c;
}
