
// ---------- state ----------
let db=null,assets=null,downloads=null,sample=null,canSeeImages=false;
let posts={},order=[],filter='todo',meta=null,settings={affiliateLink:'https://tolt.link/punditbible'};
const imgCache={},localImg={},localBlob={},nodes={},view={};
const $=s=>document.querySelector(s);
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
const SLOTS=p=>(p.template==='split'||p.template==='h2h')?['photo','photo2']:['photo'];
const searchFor=(p,k)=>k==='photo2'?(p.photoSearch2||{term:(p.fields&&p.fields.bName)||''}):(p.photoSearch||{term:p.title||''});
const slotLabel=(p,k)=>(p.template==='split'||p.template==='h2h')?(k==='photo'?'A: '+((p.fields&&p.fields.aName)||'left'):'B: '+((p.fields&&p.fields.bName)||'right')):'';

async function decode(blob){
  try{return await createImageBitmap(blob)}catch(e){}
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(blob);const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('decode'));im.src=u});
}
function loadImgById(id){if(!imgCache[id])imgCache[id]=fetch('/_blob/'+id).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(decode).catch(()=>null);return imgCache[id]}
async function photosFor(id){const p=posts[id];const out={};if(!p)return out;
  for(const k of SLOTS(p)){const ph=p[k];if(!ph||!ph.ready)continue;const key=id+':'+k;if(localImg[key])out[k]=localImg[key];else if(ph.id)out[k]=await loadImgById(ph.id)}
  if(p.bg&&p.bg.file){const b=await loadImgById(p.bg.file);if(b)out.bg=b}
  return out}
function toBlob(c,type,q){return new Promise(r=>c.toBlob(r,type,q))}
async function shrinkBlob(img,max,type){const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const x=c.getContext('2d');if(type==='image/jpeg'){x.fillStyle='#777';x.fillRect(0,0,c.width,c.height)}x.drawImage(img,0,0,c.width,c.height);return await toBlob(c,type,.9)}
function fieldToText(v,kind,keys){if(kind==='lines')return (v||[]).join('\n');if(kind==='rows')return (v||[]).map(o=>keys.map(k=>o[k]==null?'':o[k]).join(' | ').replace(/( \| )+$/,'')).join('\n');return v==null?'':String(v)}
function textToField(t,kind,keys){if(kind==='lines')return t.split('\n').map(s=>s.trim()).filter(Boolean);if(kind==='rows')return t.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{const parts=line.split('|').map(x=>x.trim());const o={};keys.forEach((k,i)=>{if(parts[i]!==undefined&&parts[i]!=='')o[k]=parts[i]});return o});return t}
async function save(id,patch){if(!db)return;try{await db.doc('posts/'+id).update(patch)}catch(e){const m=nodes[id]&&nodes[id].querySelector('.amsg');if(m)m.textContent='Could not save that change ('+(e.code||'error')+').'}}
function sampleErr(e){const c=e&&e.code;if(c==='budget')return e.message||'This month’s Claude budget is used up.';if(c==='not_granted')return 'Claude wasn’t allowed to help on this page. Reload and choose Allow when asked.';if(c==='rate_limited')return 'Too many requests just now. Try again in a minute.';if(c==='refused')return 'Claude couldn’t help with that one. Try different wording.';if(c==='invalid_json')return 'The answer came back garbled. Press the button again.';return 'Something went wrong ('+(c||'error')+'). Try again.'}
async function askJSON(prompt,opts){if(!sample)throw {code:'not_granted'};return await sample.json(prompt,opts||{})}
function hashN(s,n){let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%n}
function pinnedDefault(id){const link=settings.affiliateLink||'https://tolt.link/punditbible';
  const t=['I use PromptWise AI for my content ideas. Try it here 👉 '+link,'Want to try the AI tool I use for Pundit Bible? PromptWise AI 👉 '+link,'Make your own football content with AI: PromptWise 👉 '+link];return t[hashN(id,t.length)]}
function copyText(txt,msgEl,selectEl){const done=()=>{msgEl.textContent='Copied.';msgEl.classList.remove('warn')};const fb=()=>{if(selectEl){selectEl.focus();selectEl.select()}msgEl.textContent='Selected. Copy it now.'};try{navigator.clipboard.writeText(txt).then(done,fb)}catch(e){fb()}}
async function saveCanvas(c,name,msgEl){const b=await toBlob(c,'image/jpeg',.93);
  if(downloads){try{await downloads.save({filename:name,data:b});if(msgEl){msgEl.textContent='Saved.';msgEl.classList.remove('warn')}return true}catch(e){if(e.code==='declined')return false}}
  showModal(c.toDataURL('image/jpeg',.93));return true}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dayLabel(){return new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
function slug(s){return String(s||'post').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'post'}

// ---------- one post ----------
function slotHTML(id,k,label){return `
  <div class="slot-${k}" style="display:grid;gap:8px">
    ${label?`<div class="term"><b>${esc(label)}</b></div>`:''}
    <label class="drop" for="file-${id}-${k}"><img class="thumb" alt="" hidden><div><b>Upload photo</b><span>Tap to pick from your phone’s photos or files.</span></div><input type="file" accept="image/*" id="file-${id}-${k}" aria-label="Upload photo ${esc(label)}"></label>
    <button class="ghost pick" type="button">Choose photo from phone</button>
  </div>`}
function findHTML(k,label){return `<div class="find-${k}" style="display:grid;gap:8px">${label?`<div class="term"><b>${esc(label)}</b></div>`:''}<div class="term">Search: <b class="q"></b></div>
  <div class="row"><a class="btn g" target="_blank" rel="noopener">Find on Google Images</a><a class="btn ghost w" target="_blank" rel="noopener">Free photos</a></div><div class="msg hint2"></div></div>`}

function buildNode(id){
  const p0=posts[id];const slots=SLOTS(p0);
  const el=document.createElement('article');el.className='post';el.dataset.id=id;
  el.innerHTML=`
    <div class="prev"><canvas width="1080" height="1350" aria-label="Post image"></canvas><div class="busy" hidden></div><div class="slidenav" hidden></div></div>
    <div>
      <div class="when"></div><h3></h3><p class="why"></p>
      <div class="step"><h4><i>1</i>Find ${slots.length>1?'two photos':'a photo'}</h4>${slots.map(k=>findHTML(k,slotLabel(p0,k))).join('')}</div>
      <div class="step"><h4><i>2</i>Add ${slots.length>1?'them':'it'}</h4>${slots.map(k=>slotHTML(id,k,slotLabel(p0,k))).join('')}
        <div class="paste" contenteditable="true" role="textbox" aria-label="Paste a copied image here">Or copied it from Google? Tap here and paste.</div>
        <button class="ghost libpick" type="button">Use a photo from your library</button>
        <div class="msg pmsg"></div>
      </div>
      <div class="step"><h4><i>3</i>Generate</h4>
        <button class="gen" type="button">Generate post image</button>
        <div class="msg gmsg"></div>
        <div class="after" hidden style="display:grid;gap:10px">
          <div><div class="term" style="margin-bottom:6px">Size</div><div class="pills sizes">
            <button class="ghost" data-size="feed" aria-pressed="true" type="button">Feed 4:5</button>
            <button class="ghost" data-size="story" aria-pressed="false" type="button">Story / Reel 9:16</button>
            <button class="ghost" data-size="square" aria-pressed="false" type="button">Square 1:1</button></div></div>
          <div class="row"><button class="save" type="button">Save image</button><button class="saveall" type="button" hidden>Save all slides</button><button class="ghost copy" type="button">Copy caption</button><button class="ghost look" type="button">Try another colour</button></div>
          <details><summary>Fine-tune the photo</summary><div class="sliders-wrap" style="display:grid;gap:12px"></div></details>
          <details class="aibg" hidden><summary>AI background (Higgsfield)</summary><div style="display:grid;gap:8px">
            <label class="lab">Describe the background<input type="text" class="bgp" id="bgp-${id}" value="floodlit football stadium at night, dramatic haze, cinematic, empty stands, no people, no text"></label>
            <div class="row"><button type="button" class="ghost bggo">Make background (about 1p)</button><button type="button" class="ghost bgoff">Remove background</button></div><div class="msg bgmsg"></div></div></details>
        </div>
      </div>
      <div class="step tt" hidden><h4><i>4</i>TikTok</h4>
        <div class="ttwrap"><canvas class="ttc" width="1080" height="1920" aria-label="TikTok version"></canvas>
          <div style="display:grid;gap:10px;align-content:start">
            <div class="msg">A full-screen version with everything kept clear of TikTok’s buttons and caption.</div>
            <div class="row"><button class="ttsave" type="button">Save TikTok image</button><button class="ghost ttvid" type="button">Make 7-second video</button></div>
            <div class="msg ttmsg"></div>
            <label class="lab">TikTok caption<textarea class="ttcap" id="ttcap-${id}" rows="5"></textarea></label>
            <div class="row"><button class="ghost ttcopy" type="button">Copy TikTok caption</button><button class="ghost ttai" type="button">Rewrite with Claude</button></div>
            <div class="msg ttcmsg"></div>
          </div></div>
      </div>
      <div class="step kl" hidden><h4><i>5</i>Bring it to life in Seedance 2.5</h4>
        <div class="msg">In your Seedance 2.5 tool: <b>Image to Video</b> → upload your saved TikTok image as the start frame (@image1) → 9:16 → 8 seconds → audio on → paste the prompt. If there’s a negative prompt box, paste that too (the key points are already inside the prompt).</div>
        <label class="lab">Prompt (includes the sound effects)<textarea class="klp" id="klp-${id}" rows="10"></textarea></label>
        <div class="row"><button class="ghost klcopy" type="button">Copy prompt</button></div>
        <label class="lab">Negative prompt<textarea class="kln" id="kln-${id}" rows="4"></textarea></label>
        <div class="row"><button class="ghost klncopy" type="button">Copy negative prompt</button><button class="ghost klai" type="button">Improve with Claude (looks at your image)</button></div>
        <div class="row"><button class="ghost klremix" type="button">Remix: try a different take</button><span class="msg takename"></span></div>
        <div class="msg klmsg"></div>
        <div class="hfbox" hidden style="display:grid;gap:10px;border-top:1px solid var(--line);padding-top:12px">
          <h4 style="margin:0">Make it here with Higgsfield (Kling)</h4>
          <div class="msg">Sends your TikTok image to Kling and brings the video back. The person stays still; only the lights, smoke and camera move. If Higgsfield blocks it (real faces sometimes are), you aren't charged. Use “Make 7-second video” in step 4 instead, which is free.</div>
          <label class="lab">Kling prompt<textarea class="hfp" id="hfp-${id}" rows="5"></textarea></label>
          <div class="row"><label class="lab" style="flex-direction:row;align-items:center;gap:8px">Length <select class="hfdur" id="hfdur-${id}" style="width:auto"><option value="5">5 seconds</option><option value="10">10 seconds</option></select></label><button type="button" class="hfgo">Make video with Higgsfield</button></div>
          <div class="msg hfmsg"></div>
          <video class="hfvid" controls playsinline hidden style="max-width:260px;border-radius:12px"></video>
          <div class="row"><button type="button" class="ghost hfsave" hidden>Save video</button></div>
        </div>
        <details><summary>Part 2: extend to 16 seconds</summary>
          <div style="display:grid;gap:10px"><div class="msg">Once Part 1 is made, use Seedance’s continue/extend option: attach the Part 1 clip as <b>@video1</b>, then paste this.</div>
          <textarea class="klp2" id="klp2-${id}" rows="9" aria-label="Part 2 prompt"></textarea>
          <div class="row"><button class="ghost klcopy2" type="button">Copy Part 2 prompt</button></div></div></details>
      </div>
      <div class="step"><h4>Caption</h4><textarea class="cap" id="cap-${id}" aria-label="Caption"></textarea><div class="sources"></div>
        <div class="row"><button class="ghost copy2" type="button">Copy caption</button><button class="ghost hooks" type="button">Get 3 better hooks</button><button class="ghost mark" type="button">Mark as posted</button><span class="msg amsg"></span></div>
        <div class="opts hookopts"></div>
      </div>
      <div class="step pk" hidden><h4><i>6</i>Publishing pack</h4>
        <div class="msg">Everything for each platform in one place: the right file, the right caption and the right number of hashtags. Tick each one off as you post.</div>
        <div class="pills plats" role="tablist">
          <button class="ghost" data-plat="facebook" aria-pressed="true" type="button">Facebook<span class="tick"></span></button>
          <button class="ghost" data-plat="instagram" aria-pressed="false" type="button">Instagram<span class="tick"></span></button>
          <button class="ghost" data-plat="tiktok" aria-pressed="false" type="button">TikTok<span class="tick"></span></button>
          <button class="ghost" data-plat="youtube" aria-pressed="false" type="button">YouTube Shorts<span class="tick"></span></button>
        </div>
        <div class="pkfiles row"></div>
        <label class="lab pkcapwrap"><span class="pkcaplab">Caption</span><textarea class="pkcap" id="pkcap-${id}" rows="7"></textarea></label>
        <div class="pkyt" hidden style="display:grid;gap:10px">
          <label class="lab">Title <span class="ytn"></span><input type="text" class="yttitle" id="yttitle-${id}" maxlength="100"></label>
          <label class="lab">Description<textarea class="ytdesc" id="ytdesc-${id}" rows="6"></textarea></label>
          <label class="lab">Tags box (under “Show more” when you upload)<input type="text" class="yttags" id="yttags-${id}"></label>
        </div>
        <div class="msg pktags"></div>
        <div class="row"><button class="ghost pkcopy" type="button">Copy caption</button><button class="ghost pkcopyt" type="button" hidden>Copy title</button><button class="ghost pkreset" type="button">Reset to suggested</button><button class="ghost pkai" type="button">Rewrite all 4 with Claude</button></div>
        <label class="row" style="gap:8px;font-weight:600"><input type="checkbox" class="pkdone" id="pkdone-${id}"> <span class="pkdonelab">Posted on Facebook</span></label>
        <div class="msg pkmsg"></div>
      </div>
      <div class="step"><h4>Pinned comment (PromptWise)</h4><textarea class="pin" id="pin-${id}" rows="2" aria-label="Pinned comment"></textarea>
        <div class="row"><button class="ghost copypin" type="button">Copy comment</button><span class="msg pinmsg"></span></div></div>
      <div class="step"><details><summary>Reply to comments</summary>
        <div style="display:grid;gap:10px"><div class="msg">Paste the comments you want to answer, one per line. Claude writes short replies in the Pundit Bible voice.</div>
        <textarea class="cmts" id="cmts-${id}" rows="5" aria-label="Comments to reply to" placeholder="De Zerbi out by November, guaranteed&#10;Spurs will finish top 6 easy"></textarea>
        <div class="row"><button class="ghost doreply" type="button">Write replies</button><span class="msg rmsg"></span></div><div class="opts replies"></div></div></details></div>
      <div class="step"><details><summary>Log results</summary>
        <div style="display:grid;gap:10px"><div class="msg">After 24 hours, copy these from Facebook. They feed the Insights tab.</div>
        <div class="nums"><label>Comments<input type="number" min="0" inputmode="numeric" class="r-comments" id="rc-${id}"></label><label>Reactions<input type="number" min="0" inputmode="numeric" class="r-reactions" id="rr-${id}"></label><label>Shares<input type="number" min="0" inputmode="numeric" class="r-shares" id="rs-${id}"></label><label>Reach<input type="number" min="0" inputmode="numeric" class="r-reach" id="rh-${id}"></label></div>
        <div class="row"><button class="ghost saveres" type="button">Save results</button><span class="msg resmsg"></span></div></div></details></div>
      <div class="step"><details><summary>Edit the words on the image</summary><div class="fields"></div></details></div>
    </div>`;
  const canvas=el.querySelector('canvas'),busy=el.querySelector('.busy'),nav=el.querySelector('.slidenav');
  view[id]=view[id]||{slide:0,size:'feed'};
  const ttc=el.querySelector('.ttc');
  el._redraw=async()=>{const p=posts[id];const imgs=await photosFor(id);const sl=slideCount(p)>1?view[id].slide:0;render(canvas,p,imgs,sl);if(!el.querySelector('.tt').hidden)renderTikTok(ttc,p,imgs,sl)};

  // slide nav for carousels
  el._nav=()=>{const p=posts[id];if(slideCount(p)<2){nav.hidden=true;el.querySelector('.saveall').hidden=true;return}
    const n=slideCount(p);const gz=p.template==='guess';if(view[id].slide>=n)view[id].slide=0;nav.hidden=false;el.querySelector('.saveall').hidden=false;nav.innerHTML='';
    for(let i=0;i<n;i++){const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent=gz?(i===0?'Quiz':'Answer'):(i===0?'Cover':i===n-1?'Last':String(i));b.setAttribute('aria-pressed',String(i===view[id].slide));b.onclick=()=>{view[id].slide=i;el._nav();el._redraw()};nav.appendChild(b)}};

  // ---- add photo ----
  const pm=el.querySelector('.pmsg');
  async function addFile(k,file){
    if(!file)return;
    if(file.type&&!/^image\//.test(file.type)){pm.textContent='That isn’t an image. Pick a JPG or PNG.';pm.classList.add('warn');return}
    pm.classList.remove('warn');pm.textContent='Loading photo…';
    let img;try{img=await decode(file)}catch(e){pm.textContent='That photo couldn’t be opened. Try a JPG or PNG (screenshots work too).';pm.classList.add('warn');return}
    const key=id+':'+k;localImg[key]=img;localBlob[key]=file;
    const th=el.querySelector('.slot-'+k+' .thumb');th.src=URL.createObjectURL(file);th.hidden=false;
    const p=posts[id];p[k]={ready:false,focus:null,cut:null,zoom:1,dx:0,dy:0,id:null};
    const missing=SLOTS(p).filter(s=>!localImg[id+':'+s]&&!(p[s]&&p[s].id));
    pm.textContent=missing.length?'Photo added. Now add the other one.':'Photo added. Now press Generate.';
  }
  slots.forEach(k=>{
    const fi=el.querySelector('#file-'+id+'-'+k),drop=el.querySelector('.slot-'+k+' .drop');let last=0;
    const onPick=()=>{const f=fi.files&&fi.files[0];if(!f)return;const now=Date.now();if(now-last<500)return;last=now;addFile(k,f);setTimeout(()=>{fi.value=''},0)};
    fi.addEventListener('change',onPick);fi.addEventListener('input',onPick);
    el.querySelector('.slot-'+k+' .pick').addEventListener('click',()=>{try{if(fi.showPicker)fi.showPicker();else fi.click()}catch(e){fi.click()}});
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});
    drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');addFile(k,e.dataTransfer.files&&e.dataTransfer.files[0])});
  });
  const paste=el.querySelector('.paste');
  paste.addEventListener('focus',()=>{if(!paste._c){paste.textContent='';paste._c=true}});
  paste.addEventListener('paste',e=>{e.preventDefault();const items=(e.clipboardData&&e.clipboardData.items)||[];let file=null;
    for(const it of items){if(it.kind==='file'&&/^image\//.test(it.type)){file=it.getAsFile();break}}
    if(!file){pm.textContent='No image on the clipboard. In Google Images, press and hold the photo, choose Copy, then paste here.';pm.classList.add('warn');return}
    const p=posts[id];const k=SLOTS(p).find(s=>!localImg[id+':'+s])||SLOTS(p)[0];addFile(k,file);paste.textContent='';paste.blur()});
  paste.addEventListener('input',()=>{paste.textContent=''});
  el.querySelector('.libpick').addEventListener('click',()=>{const p=posts[id];const k=SLOTS(p).find(s=>!localImg[id+':'+s]&&!(p[s]&&p[s].ready))||SLOTS(p)[0];
    if(typeof openLibraryPicker!=='function')return;openLibraryPicker(searchFor(p,k).term||p.title||'',async(item)=>{pm.textContent='Loading photo…';const img=await loadImgById(item.file);if(!img){pm.textContent='That photo couldn’t be loaded.';return}
      const key=id+':'+k;localImg[key]=img;delete localBlob[key];const th=el.querySelector('.slot-'+k+' .thumb');fetch('/_blob/'+item.file).then(r=>r.blob()).then(b=>{th.src=URL.createObjectURL(b);th.hidden=false}).catch(()=>{});
      posts[id][k]={ready:false,focus:null,cut:null,zoom:1,dx:0,dy:0,id:item.file};pm.textContent='Photo added from your library. Now press Generate.'})});

  // ---- generate ----
  const gm=el.querySelector('.gmsg');
  async function frame(k,img){
    const p=posts[id];const cut=isCutout(img);let focus=cut?alphaFocus(img):null;let note='';let who=null;
    if(sample&&canSeeImages){
      try{const blob=await shrinkBlob(img,1200,'image/jpeg');const term=searchFor(p,k).term||p.title||'';
        const r=await sample.json(`You are helping design a football social media graphic. The attached photo will go on a post titled "${p.title||''}" (photo search: "${term}").
Reply with only JSON like {"face":{"x":0.41,"y":0.12,"w":0.2,"h":0.27},"who":"Roberto De Zerbi on the touchline","matches":true,"problem":""}
- face: bounding box of the main person's face (top of the hair down to the chin), as fractions of the image width and height; x,y is the top-left corner. If several people are in the photo, choose the one this post is about. If there is no face, box the main subject.
- who: a few words on who or what the photo shows.
- matches: true if the photo plausibly shows who this post is about, false if it is clearly someone else, null if you can't tell.
- problem: "" or a short warning if the photo is poor for a post (tiny, very blurry, big watermark or text across it).`,{images:blob});
        const fc=r&&r.face;
        if(fc&&[fc.x,fc.y,fc.w,fc.h].every(v=>typeof v==='number'&&isFinite(v))&&fc.w>0.02&&fc.h>0.02&&fc.x>=-0.05&&fc.y>=-0.05&&fc.x+fc.w<=1.05&&fc.y+fc.h<=1.05)focus={x:fc.x,y:fc.y,w:fc.w,h:fc.h};
        if(r&&r.who)who=String(r.who).slice(0,80);
        if(r&&r.matches===false)note='Heads up: this looks like '+(r.who||'someone else')+'. Check it’s the right person.';else if(r&&r.problem)note='Heads up: '+r.problem;
      }catch(e){if(e&&e.code==='not_granted')sample=null}}
    return {photo:{...(p[k]||{}),ready:true,cut,focus:focus||(cut?null:DEFAULT_FOCUS),zoom:1,dx:0,dy:0,...(who?{who}:{})},note};
  }
  el.querySelector('.gen').addEventListener('click',async()=>{
    const p=posts[id];const ks=SLOTS(p);const imgs={};
    for(const k of ks){let img=localImg[id+':'+k];if(!img&&p[k]&&p[k].id)img=await loadImgById(p[k].id);if(img)imgs[k]=img}
    if(!imgs.photo&&!['carousel','split','h2h','goal','result'].includes(p.template)){gm.textContent='Add a photo in step 2 first.';gm.classList.add('warn');return}
    if(p.template==='split'&&(!imgs.photo||!imgs.photo2)){gm.textContent='Add both photos in step 2 first.';gm.classList.add('warn');return}
    gm.classList.remove('warn');gm.textContent='';busy.hidden=false;busy.textContent=sample&&canSeeImages?'Finding the face and framing the shot…':'Designing your image…';
    const notes=[];
    await Promise.all(Object.keys(imgs).map(async k=>{const r=await frame(k,imgs[k]);p[k]=r.photo;localImg[id+':'+k]=imgs[k];if(r.note)notes.push(r.note)}));
    el._sliders();view[id].slide=0;el._nav();await el._redraw();busy.hidden=true;
    el.querySelector('.after').hidden=false;el.querySelector('.tt').hidden=false;el.querySelector('.kl').hidden=false;el.querySelector('.pk').hidden=false;el._pkShow();if(!posts[id].vid)el._fillTT(true);await el._redraw();gm.textContent=notes.join(' ')||'Done. Save it, or try another colour.';gm.classList.toggle('warn',notes.length>0);
    const patch={};
    for(const k of Object.keys(imgs)){const ph=p[k];const key=id+':'+k;
      if(!ph.id&&assets&&localBlob[key]){try{const up=await shrinkBlob(imgs[k],1800,ph.cut?'image/png':'image/jpeg');const r=await assets.upload(up);ph.id=r.id;imgCache[r.id]=Promise.resolve(imgs[k]);try{db.doc('photos/'+String(r.id).replace(/[^A-Za-z0-9_.-]/g,'_')).set({file:r.id,name:searchFor(p,k).term||p.title||'',who:ph.who||'',post:id,cut:!!ph.cut,at:new Date().toISOString()})}catch(e){}}catch(e){pm.textContent='The image works, but the photo wasn’t saved to the app ('+(e.code||'error')+'), so add it again next time.'}}
      patch[k]=ph}
    await save(id,patch);
  });

  // ---- AI background ----
  el.querySelector('.aibg').hidden=!(window.PB&&window.PB.higgsfield);
  el.querySelector('.bggo').addEventListener('click',async()=>{const m=el.querySelector('.bgmsg'),b=el.querySelector('.bggo');b.disabled=true;m.classList.remove('warn');
    try{m.textContent='Making your background…';const job=await window.PB.higgsfield.image({prompt:el.querySelector('.bgp').value,aspect:'4:5'});
      const s=await window.PB.higgsfield.wait(job.id,(st,sec)=>{m.textContent='Making your background… '+sec+'s'});
      if(s.status==='completed'){posts[id].bg={file:s.file};await save(id,{bg:posts[id].bg});await el._redraw();m.textContent='Done.'}else{m.textContent=s.message||'It didn’t work.';m.classList.add('warn')}}
    catch(e){m.textContent=e.message;m.classList.add('warn')}b.disabled=false});
  el.querySelector('.bgoff').addEventListener('click',async()=>{posts[id].bg=null;await save(id,{bg:null});el._redraw()});

  // ---- after generate ----
  el._sliders=()=>{const w=el.querySelector('.sliders-wrap');w.innerHTML='';const p=posts[id];
    SLOTS(p).forEach(k=>{if(!p[k]||!p[k].ready)return;const box=document.createElement('div');box.className='sliders';
      const lab=slotLabel(p,k);box.innerHTML=(lab?`<div class="term" style="grid-column:1/-1"><b>${esc(lab)}</b></div>`:'')+
        `<label>Size<input type="range" min="0.6" max="1.8" step="0.02" data-k="zoom" id="z-${id}-${k}"></label><label>Left / right<input type="range" min="-400" max="400" step="5" data-k="dx" id="x-${id}-${k}"></label><label>Up / down<input type="range" min="-400" max="400" step="5" data-k="dy" id="y-${id}-${k}"></label>`;
      box.querySelectorAll('input').forEach(inp=>{inp.value=p[k][inp.dataset.k]!=null?p[k][inp.dataset.k]:(inp.dataset.k==='zoom'?1:0);let t;
        inp.addEventListener('input',()=>{p[k]={...p[k],[inp.dataset.k]:+inp.value};el._redraw();clearTimeout(t);t=setTimeout(()=>save(id,{[k]:p[k]}),800)})});
      w.appendChild(box)})};
  el.querySelectorAll('.sizes button').forEach(b=>b.addEventListener('click',()=>{view[id].size=b.dataset.size;el.querySelectorAll('.sizes button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
  el.querySelector('.look').addEventListener('click',()=>{const p=posts[id];const i=THEME_ORDER.indexOf(p.theme);p.theme=THEME_ORDER[(i+1)%THEME_ORDER.length];el._redraw();save(id,{theme:p.theme})});
  el.querySelector('.save').addEventListener('click',async()=>{await el._redraw();const p=posts[id];const s=view[id].size;
    const name='pundit-bible-'+id+(slideCount(p)>1?'-'+(view[id].slide+1):'')+(s==='feed'?'':'-'+s)+'.jpg';
    await saveCanvas(exportCanvas(canvas,s),name,gm)});
  el.querySelector('.saveall').addEventListener('click',async()=>{const p=posts[id];const n=slideCount(p);const imgs=await photosFor(id);const s=view[id].size;
    for(let i=0;i<n;i++){const c=document.createElement('canvas');render(c,p,imgs,i);gm.textContent='Saving slide '+(i+1)+' of '+n+'…';const ok=await saveCanvas(exportCanvas(c,s),'pundit-bible-'+id+'-'+(i+1)+(s==='feed'?'':'-'+s)+'.jpg',null);if(!ok)break}
    gm.textContent=p.template==='guess'?'Done. Post the quiz now and the answer slide tomorrow.':'Done. Upload them to Facebook in order as one post.';render(canvas,p,imgs,view[id].slide)});

  // ---- TikTok + Kling ----
  const ttm=el.querySelector('.ttmsg');
  el.querySelector('.ttsave').addEventListener('click',async()=>{const p=posts[id];const imgs=await photosFor(id);const c=cnv(TW,TH);const sl=slideCount(p)>1?view[id].slide:0;renderTikTok(c,p,imgs,sl);
    await saveCanvas(c,'pundit-bible-'+id+(slideCount(p)>1?'-'+(sl+1):'')+'-tiktok.jpg',ttm)});
  el.querySelector('.ttvid').addEventListener('click',async()=>{const p=posts[id];const b=el.querySelector('.ttvid');
    if(p.template==='carousel'){ttm.textContent='Carousels go on TikTok as a photo post: use Save all slides with the Story size, then + \u2192 Photo in TikTok.';return}
    b.disabled=true;ttm.classList.remove('warn');ttm.textContent='Recording your video\u2026 keep this screen open (7 seconds).';
    try{const imgs=await photosFor(id);const r=await recordTikTok(p,imgs,f=>{ttm.textContent='Recording your video\u2026 '+Math.round(f*100)+'%'});
      const name='pundit-bible-'+id+'-tiktok.'+r.ext;
      if(downloads){try{await downloads.save({filename:name,data:r.blob});ttm.textContent='Saved. In TikTok: + \u2192 Upload \u2192 pick the video \u2192 add a trending sound.'+(r.ext==='webm'?' (This browser made a .webm file. TikTok on the web accepts it; if your phone won\u2019t, make it in Safari or Chrome on your phone instead.)':'')}catch(e){ttm.textContent=e.code==='declined'?'':'Could not save the video ('+(e.code||'error')+').'}}
      else{const u=URL.createObjectURL(r.blob);const m=document.createElement('div');m.className='modal';m.innerHTML='<div><video controls playsinline style="max-height:78vh;max-width:100%"></video><p>Saving isn\u2019t available in this view. Open the Studio in Claude to save the video. Tap outside to close.</p></div>';m.querySelector('video').src=u;m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m);ttm.textContent=''}
    }catch(e){ttm.textContent=e.message||'Could not make the video.';ttm.classList.add('warn')}
    b.disabled=false});
  const ttcap=el.querySelector('.ttcap');let tct=null;
  ttcap.addEventListener('input',()=>{posts[id].ttCaption=ttcap.value;if(plat==='tiktok')pkcap.value=ttcap.value;clearTimeout(tct);tct=setTimeout(()=>save(id,{ttCaption:ttcap.value}),800)});
  el.querySelector('.ttcopy').addEventListener('click',()=>copyText(ttcap.value,el.querySelector('.ttcmsg'),ttcap));
  el.querySelector('.ttai').addEventListener('click',async()=>{const m=el.querySelector('.ttcmsg'),b=el.querySelector('.ttai');const p=posts[id];
    if(!sample){m.textContent='This needs Claude, which isn\u2019t available in this view.';return}
    b.disabled=true;m.textContent='Writing\u2026';
    try{const r=await askJSON(`Rewrite this Facebook football post caption as a TikTok caption for Pundit Bible (UK football page). Rules: max 150 characters before the hashtags; first line is a scroll-stopping hook; end with one easy question; then 4-5 hashtags (TikTok works best with 3-5 focused tags): #Football #FootballTikTok plus the most-used tags for the club/player/competition in the caption. No unrelated trending tags. Use ONLY facts in the caption below; no new facts, numbers or quotes. No "like if", "share if", "tag a mate", "type YES". Max 2 emojis.
Caption:
${String(p.caption||'').slice(0,2000)}
Reply with only JSON: {"caption":"..."}`,{cache:false});
      if(r&&r.caption){ttcap.value=String(r.caption);p.ttCaption=ttcap.value;save(id,{ttCaption:p.ttCaption});m.textContent='Done.'}else m.textContent='Nothing came back. Try again.'}
    catch(e){m.textContent=sampleErr(e)}b.disabled=false});
  const klp=el.querySelector('.klp'),kln=el.querySelector('.kln');let klt=null;
  const klSave=()=>{clearTimeout(klt);klt=setTimeout(()=>{posts[id].vid={prompt:klp.value,negative:kln.value,take:(posts[id].vid&&posts[id].vid.take)||0};save(id,{vid:posts[id].vid})},800)};
  klp.addEventListener('input',klSave);kln.addEventListener('input',klSave);
  el.querySelector('.klcopy').addEventListener('click',()=>copyText(klp.value,el.querySelector('.klmsg'),klp));
  const klp2=el.querySelector('.klp2');let k2t=null;
  klp2.addEventListener('input',()=>{clearTimeout(k2t);k2t=setTimeout(()=>{posts[id].vid2=klp2.value;save(id,{vid2:klp2.value})},800)});
  el.querySelector('.klcopy2').addEventListener('click',()=>copyText(klp2.value,el.querySelector('.klmsg'),klp2));
  el.querySelector('.klremix').addEventListener('click',()=>{const p=posts[id];const cur=(p.vid&&typeof p.vid.take==='number')?p.vid.take:0;const k=seedanceFor(p,cur+1);
    klp.value=k.prompt;kln.value=k.negative;p.vid={prompt:k.prompt,negative:k.negative,take:k.take};save(id,{vid:p.vid});
    el.querySelector('.takename').textContent=k.takeName+(sample&&canSeeImages?'. Tap Improve with Claude to tailor it to your image.':'');});
  el.querySelector('.klncopy').addEventListener('click',()=>copyText(kln.value,el.querySelector('.klmsg'),kln));
  el.querySelector('.klai').addEventListener('click',async()=>{const m=el.querySelector('.klmsg'),b=el.querySelector('.klai');const p=posts[id];
    if(!sample||!canSeeImages){m.textContent='This needs Claude with image access, which isn\u2019t available in this view. The prompt above still works.';return}
    b.disabled=true;m.textContent='Claude is looking at your TikTok image\u2026 (up to a minute)';
    try{const imgs=await photosFor(id);const c=cnv(TW,TH);renderTikTok(c,p,imgs,slideCount(p)>1?view[id].slide:0);const blob=await toBlob(c,'image/jpeg',.9);
      const r=await askJSON(`You write image-to-video prompts for Seedance 2.5 that make football TikToks people stop, rewatch and comment on. The attached 9:16 image is a finished Pundit Bible post graphic (post: "${p.title||''}") and will be the start frame (@image1).
Improve the draft below so it is specific to exactly what you can see in the image. Keep its section structure (TOP PRIORITY, REFERENCE KEY, LIGHTING, IMAGE QUALITY, CAMERA, ACTING TASK with SCENE DIRECTION / MOTIVE / GOAL / TACTIC / Moment to moment, BACKGROUND & PHYSICS, GRAPHIC ACCENTS, COMPOSITION, EDITING, ON-SCREEN TEXT, AUDIO, MOOD & TEMPO, SHOT BREAKDOWN, AVOID) and its 8-second timing.
Rules: describe the real person's look (face, hair, facial hair, headwear, clothes, pose, hands) so identity stays locked; keep every word, number, logo, label, panel and the question bar a LOCKED static overlay; direct the performance as an invested task keyed to the story (not emotion adjectives); a scroll-stopping hook in the first 0.5s; one named centrepiece beat that fits the story; a final beat where the subject dares the viewer to answer the question on the card; a loop back to the first frame; 5-8 timed sound effects with no music and no speech; nothing that could be read as speech or lip-sync.
Also write a comma-separated negative prompt focused on text/logo warping, identity changes, hands, flicker, camera shake, cuts, cartoon/CGI, speech and music.
Draft:
${klp.value.slice(0,9000)}
Reply with only JSON: {"prompt":"...","negative":"..."}`,{images:blob,cache:false});
      if(r&&r.prompt){klp.value=String(r.prompt);if(r.negative)kln.value=String(r.negative);posts[id].vid={prompt:klp.value,negative:kln.value,take:(posts[id].vid&&posts[id].vid.take)||0};save(id,{vid:posts[id].vid});m.textContent='Updated from your image.'}else m.textContent='Nothing came back. Try again.'}
    catch(e){m.textContent=sampleErr(e)}b.disabled=false});
  // ---- Higgsfield (Kling) ----
  const hfbox=el.querySelector('.hfbox'),hfp=el.querySelector('.hfp'),hfm=el.querySelector('.hfmsg'),hfvid=el.querySelector('.hfvid'),hfsave=el.querySelector('.hfsave');let hfBlob=null;
  hfbox.hidden=!(window.PB&&window.PB.higgsfield);
  async function hfShow(file){const b=await (await fetch('/_blob/'+file)).blob();hfBlob=b;hfvid.src=URL.createObjectURL(b);hfvid.hidden=false;hfsave.hidden=false}
  el.querySelector('.hfgo').addEventListener('click',async()=>{const p=posts[id];const b=el.querySelector('.hfgo');b.disabled=true;hfm.classList.remove('warn');
    try{hfm.textContent='Sending to Higgsfield…';const imgs=await photosFor(id);const c=cnv(TW,TH);renderTikTok(c,p,imgs,slideCount(p)>1?view[id].slide:0);const blob=await toBlob(c,'image/jpeg',.9);
      const job=await window.PB.higgsfield.video({image:blob,prompt:hfp.value,negative:klingNeg(p),duration:+el.querySelector('.hfdur').value,post:id});
      hfm.textContent='Kling is making your video (about $'+Number(job.usd||0).toFixed(2)+'). Usually 1–3 minutes; you can carry on in another tab.';
      const s=await window.PB.higgsfield.wait(job.id,(st,sec)=>{hfm.textContent='Kling is working… '+sec+'s ('+(st.status||'queued').replace('_',' ')+')'});
      if(s.status==='completed'){await hfShow(s.file);p.hfVideo={file:s.file,at:new Date().toISOString()};save(id,{hfVideo:p.hfVideo});hfm.textContent='Done. Save it, then post it with the TikTok caption.'}
      else{hfm.textContent=s.message||('It didn’t work ('+s.status+').');hfm.classList.add('warn')}}
    catch(e){hfm.textContent=e.message||'Something went wrong.';hfm.classList.add('warn')}b.disabled=false});
  hfsave.addEventListener('click',async()=>{if(!hfBlob)return;if(downloads){try{await downloads.save({filename:'pundit-bible-'+id+'-kling.mp4',data:hfBlob});hfm.textContent='Saved.'}catch(e){if(e.code!=='declined')hfm.textContent='Could not save.'}}});
  el._hf=()=>{const p=posts[id];if(!hfp.value||!el.contains(document.activeElement))hfp.value=p.hfPrompt||klingPromptFor(p);if(p.hfVideo&&p.hfVideo.file&&hfvid.hidden)hfShow(p.hfVideo.file).catch(()=>{})};
  hfp.addEventListener('input',()=>{clearTimeout(hfp._t);hfp._t=setTimeout(()=>{posts[id].hfPrompt=hfp.value;save(id,{hfPrompt:hfp.value})},800)});
  el._fillTT=(force)=>{const p=posts[id];if(force||!p.ttCaption)ttcap.value=p.ttCaption||ttCaptionFor(p);else ttcap.value=p.ttCaption;
    const k=(!force&&p.vid&&p.vid.prompt)?p.vid:seedanceFor(p,(p.vid&&p.vid.take)||0);klp.value=k.prompt;kln.value=k.negative||SEED_NEG;
    klp2.value=(!force&&p.vid2)?p.vid2:seedancePart2(p);el.querySelector('.takename').textContent=SEED_TAKES[((p.vid&&p.vid.take)||0)%SEED_TAKES.length].name};

  // caption + hooks
  const cap=el.querySelector('.cap');let ct=null;
  cap.addEventListener('input',()=>{posts[id].caption=cap.value;clearTimeout(ct);ct=setTimeout(()=>save(id,{caption:cap.value}),800)});
  el.querySelector('.copy').addEventListener('click',()=>copyText(cap.value,gm,cap));
  el.querySelector('.copy2').addEventListener('click',()=>copyText(cap.value,el.querySelector('.amsg'),cap));
  el.querySelector('.mark').addEventListener('click',()=>{const p=posts[id];p.status=p.status==='posted'?'todo':'posted';const patch={status:p.status};if(p.status==='posted'){p.postedAt=new Date().toISOString();patch.postedAt=p.postedAt}renderList();save(id,patch)});
  el.querySelector('.hooks').addEventListener('click',async()=>{const box=el.querySelector('.hookopts'),m=el.querySelector('.amsg'),b=el.querySelector('.hooks');const p=posts[id];
    if(!sample){m.textContent='This needs Claude, which isn’t available in this view.';return}
    b.disabled=true;m.textContent='Writing options…';box.innerHTML='';
    try{const r=await askJSON(`You write for Pundit Bible, a UK football Facebook page. Here is a post.
Title: ${p.title||''}
Current yellow-bar question on the image: ${(p.fields&&p.fields.question)||''}
Caption:
${(p.caption||'').slice(0,2500)}

Write 3 stronger alternatives that make people stop scrolling and comment. Each has:
- "question": the question for the yellow bar on the image, max 40 characters, easy to answer in one or two words.
- "hook": a new first line for the caption, max 90 characters, punchy, confident, a bit cheeky.
Use ONLY facts already in the caption; add no new facts, numbers or quotes. No engagement bait ("like if", "share if", "tag a mate", "type YES"). Make the 3 options clearly different from each other (e.g. provocative, stat-led, banter).
Reply with only JSON: [{"question":"...","hook":"..."},{...},{...}]`,{cache:false});
      (Array.isArray(r)?r:[]).slice(0,3).forEach(o=>{if(!o||!o.question)return;const d=document.createElement('div');d.className='opt';
        d.innerHTML=`<div><span class="term">Image question:</span> <b></b></div><div><span class="term">Caption opener:</span> <span class="hk"></span></div><div class="row"><button class="ghost" type="button">Use this</button></div>`;
        d.querySelector('b').textContent=o.question;d.querySelector('.hk').textContent=o.hook||'';
        d.querySelector('button').onclick=()=>{const pp=posts[id];pp.fields={...(pp.fields||{}),question:String(o.question)};
          if(o.hook){const parts=(pp.caption||'').split(/\n\n/);parts[0]=String(o.hook);pp.caption=parts.join('\n\n')}
          cap.value=pp.caption||'';el._sig=null;el._redraw();save(id,{fields:pp.fields,caption:pp.caption});m.textContent='Updated the image and caption.';box.innerHTML='';fillFields()};
        box.appendChild(d)});
      m.textContent=box.children.length?'Pick one:':'No options came back. Try again.';
    }catch(e){m.textContent=sampleErr(e)}b.disabled=false});


  // ---- publishing pack ----
  const PL=['facebook','instagram','tiktok','youtube'];let plat='facebook';
  const pkcap=el.querySelector('.pkcap'),pkm=el.querySelector('.pkmsg'),pkt=el.querySelector('.pktags');
  const yt={title:el.querySelector('.yttitle'),desc:el.querySelector('.ytdesc'),tags:el.querySelector('.yttags')};
  const FILES={
    facebook:[['Save 4:5 image','feed'],['Save Reel 9:16','story'],['Make video (for a Reel)','video']],
    instagram:[['Save 4:5 image','feed'],['Save Story 9:16','story'],['Make video (for a Reel)','video']],
    tiktok:[['Save TikTok image','tt'],['Make 7-second video','video']],
    youtube:[['Make 7-second video','video']]};
  const HOWTO={facebook:'Feed post: the 4:5 image. Reel: the video. Hashtags go at the end of the caption.',
    instagram:'Feed post: the 4:5 image. Story: the 9:16 image (add a poll or question sticker). Reel: the video.',
    tiktok:'Photo post: the TikTok image. Video: the 7-second video, then pick a trending sound in TikTok.',
    youtube:'Upload the 7-second video from your phone’s YouTube app as a Short (9:16, under 3 minutes).'};
  function pkUpdateNote(){const txt=plat==='youtube'?(yt.title.value+'\n'+yt.desc.value):pkcap.value;const n=tagNote(plat,txt);pkt.textContent=n.text;pkt.classList.toggle('warn',n.over);
    if(plat==='youtube'){el.querySelector('.ytn').textContent='('+yt.title.value.length+'/100)'}}
  function pkShow(){const p=posts[id];const pk=packOf(p);
    el.querySelectorAll('.plats button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.plat===plat));b.querySelector('.tick').textContent=(p.posted&&p.posted[b.dataset.plat])?' ✓':''});
    const isY=plat==='youtube';el.querySelector('.pkcapwrap').hidden=isY;el.querySelector('.pkyt').hidden=!isY;el.querySelector('.pkcopyt').hidden=!isY;
    el.querySelector('.pkcopy').textContent=isY?'Copy description':'Copy caption';
    if(isY){yt.title.value=pk.youtube.title;yt.desc.value=pk.youtube.description;yt.tags.value=pk.youtube.tags}else pkcap.value=pk[plat];
    el.querySelector('.pkcaplab').textContent=HT_RULES[plat].label+' caption';
    const fb=el.querySelector('.pkfiles');fb.innerHTML='';const hw=document.createElement('div');hw.className='msg';hw.style.flexBasis='100%';hw.textContent=HOWTO[plat];fb.appendChild(hw);
    FILES[plat].forEach(([lab,k])=>{if(k==='video'&&p.template==='carousel')return;const b=document.createElement('button');b.type='button';b.textContent=lab;b.onclick=()=>pkFile(k);fb.appendChild(b)});
    el.querySelector('.pkdone').checked=!!(p.posted&&p.posted[plat]);el.querySelector('.pkdonelab').textContent='Posted on '+HT_RULES[plat].label;pkUpdateNote()}
  async function pkFile(k){const p=posts[id];const imgs=await photosFor(id);const sl=slideCount(p)>1?view[id].slide:0;
    if(k==='video'){el.querySelector('.ttvid').click();pkm.textContent='Making the video. Watch the TikTok step above for progress.';return}
    if(k==='tt'){const c=cnv(TW,TH);renderTikTok(c,p,imgs,sl);await saveCanvas(c,'pundit-bible-'+id+'-tiktok.jpg',pkm);return}
    const c=document.createElement('canvas');render(c,p,imgs,sl);await saveCanvas(exportCanvas(c,k),'pundit-bible-'+id+'-'+plat+(k==='feed'?'':'-'+k)+'.jpg',pkm)}
  el.querySelectorAll('.plats button').forEach(b=>b.addEventListener('click',()=>{plat=b.dataset.plat;pkm.textContent='';pkShow()}));
  let pkT=null;const pkSave=()=>{const p=posts[id];clearTimeout(pkT);
    if(plat==='tiktok'){p.ttCaption=pkcap.value;ttcap.value=pkcap.value;pkT=setTimeout(()=>save(id,{ttCaption:p.ttCaption}),800)}
    else{const pack={...(p.pack||{})};if(plat==='youtube')pack.youtube={title:yt.title.value,description:yt.desc.value,tags:yt.tags.value};else pack[plat]=pkcap.value;p.pack=pack;pkT=setTimeout(()=>save(id,{pack}),800)}
    pkUpdateNote()};
  [pkcap,yt.title,yt.desc,yt.tags].forEach(x=>x.addEventListener('input',pkSave));
  el.querySelector('.pkcopy').addEventListener('click',()=>plat==='youtube'?copyText(yt.desc.value,pkm,yt.desc):copyText(pkcap.value,pkm,pkcap));
  el.querySelector('.pkcopyt').addEventListener('click',()=>copyText(yt.title.value,pkm,yt.title));
  el.querySelector('.pkreset').addEventListener('click',()=>{const p=posts[id];const pack={...(p.pack||{})};delete pack[plat];p.pack=pack;
    if(plat==='tiktok'){p.ttCaption=ttCaptionFor(p);ttcap.value=p.ttCaption;save(id,{ttCaption:p.ttCaption})}save(id,{pack});pkShow();pkm.textContent='Back to the suggested version.'});
  el.querySelector('.pkdone').addEventListener('change',e=>{const p=posts[id];const posted={...(p.posted||{})};if(e.target.checked)posted[plat]=new Date().toISOString();else delete posted[plat];p.posted=posted;
    const patch={posted};const all=PL.every(k=>posted[k]);if(all&&p.status!=='posted'){p.status='posted';p.postedAt=new Date().toISOString();patch.status='posted';patch.postedAt=p.postedAt;pkm.textContent='All four done. Moved to Posted.'}
    else pkm.textContent=e.target.checked?'Ticked off. '+PL.filter(k=>!posted[k]).map(k=>HT_RULES[k].label).join(', ')+' still to go.':'';
    pkShow();save(id,patch);if(patch.status)setTimeout(renderList,1200)});
  el.querySelector('.pkai').addEventListener('click',async()=>{const b=el.querySelector('.pkai');const p=posts[id];
    if(!sample){pkm.textContent='This needs Claude, which isn’t available in this view.';return}
    b.disabled=true;pkm.textContent='Writing all four… (up to a minute)';
    const P=tagPool(p);const pool=dedupe([...P.people,...P.clubs,...P.league,P.type,...P.broad,'#PunditBible']);
    try{const r=await askJSON(`You run social media for Pundit Bible, a UK football page. Rewrite this post for four platforms so each one gets maximum reach and comments.
Post title: ${p.title||''}
Question on the image: ${questionOf(p)}
Caption:
${captionBody(p).slice(0,2500)}

Hashtags you may use (all relevant to this post): ${pool.join(' ')}. You may add at most 2 other widely used, clearly relevant tags (e.g. the club or player's most-used tag). Never use unrelated trending tags.
Rules per platform:
- facebook: conversational, 2-5 short lines, ends with the question, then EXACTLY 3 hashtags (one broad, one about the club/player, one about the type of post).
- instagram: punchy first line (it is cut after ~125 characters), 2-5 short lines, question, then EXACTLY 5 hashtags (Instagram's maximum).
- tiktok: max 150 characters before the hashtags, a hook plus the question, then 4-5 hashtags including #FootballTikTok (or #BoxingTikTok for boxing).
- youtube: title max 90 characters including 1-2 hashtags at the end, searchable (names first); description 2-4 lines ending with the question, then 3-4 hashtags including #Shorts.
Use ONLY facts in the caption above; no new facts, numbers or quotes. No engagement bait ("like if", "share if", "tag a mate", "type YES"). Max 2 emojis per platform. UK English.
Reply with only JSON: {"facebook":"...","instagram":"...","tiktok":"...","youtube":{"title":"...","description":"..."}}`,{cache:false});
      if(!r||typeof r.facebook!=='string'){pkm.textContent='Nothing came back. Try again.';b.disabled=false;return}
      const pack={...(p.pack||{}),facebook:clipTags(r.facebook,5),instagram:clipTags(r.instagram||'',5)};
      if(r.youtube&&r.youtube.title)pack.youtube={title:clipTags(String(r.youtube.title),2).slice(0,100),description:clipTags(String(r.youtube.description||''),5),tags:packOf(p).youtube.tags};
      p.pack=pack;const patch={pack};if(r.tiktok){p.ttCaption=clipTags(r.tiktok,5);ttcap.value=p.ttCaption;patch.ttCaption=p.ttCaption}
      save(id,patch);pkShow();pkm.textContent='Done. All four rewritten with the right hashtag counts.'}
    catch(e){pkm.textContent=sampleErr(e)}b.disabled=false});
  el._pkShow=pkShow;
  // pinned comment
  const pin=el.querySelector('.pin');let pt=null;
  pin.addEventListener('input',()=>{posts[id].pinned=pin.value;clearTimeout(pt);pt=setTimeout(()=>save(id,{pinned:pin.value}),800)});
  el.querySelector('.copypin').addEventListener('click',()=>copyText(pin.value,el.querySelector('.pinmsg'),pin));

  // replies
  el.querySelector('.doreply').addEventListener('click',async()=>{const t=el.querySelector('.cmts').value.trim(),m=el.querySelector('.rmsg'),box=el.querySelector('.replies'),b=el.querySelector('.doreply');const p=posts[id];
    if(!t){m.textContent='Paste some comments first.';return}if(!sample){m.textContent='This needs Claude, which isn’t available in this view.';return}
    b.disabled=true;m.textContent='Writing replies…';box.innerHTML='';
    try{const r=await askJSON(`You run Pundit Bible, a UK football Facebook page with a confident, funny, banter-heavy voice. Reply to these comments left on our post.
Post: ${p.title||''}
Caption: ${(p.caption||'').slice(0,1200)}

Comments (one per line):
${t.slice(0,4000)}

Rules: each reply 1-2 short sentences; witty and friendly banter, never abusive, never mocking anyone's looks, family or background; stay on football; where it fits, end with a quick question to keep the thread going; don't invent facts or stats; no emojis overload (max 1); no "like if"/"share if".
Reply with only JSON: [{"comment":"<the original comment>","reply":"<your reply>"}]`,{cache:false});
      (Array.isArray(r)?r:[]).forEach(o=>{if(!o||!o.reply)return;const d=document.createElement('div');d.className='opt';
        d.innerHTML=`<div class="term"></div><div><b></b></div><div class="row"><button class="ghost" type="button">Copy reply</button><span class="msg"></span></div>`;
        d.querySelector('.term').textContent='“'+(o.comment||'')+'”';d.querySelector('b').textContent=o.reply;
        d.querySelector('button').onclick=()=>copyText(String(o.reply),d.querySelector('.msg'));box.appendChild(d)});
      m.textContent=box.children.length?'':'No replies came back. Try again.';
    }catch(e){m.textContent=sampleErr(e)}b.disabled=false});

  // results
  el.querySelector('.saveres').addEventListener('click',async()=>{const p=posts[id];const g=c=>{const v=el.querySelector('.r-'+c).value;return v===''?null:Math.max(0,Math.round(+v))};
    p.results={comments:g('comments'),reactions:g('reactions'),shares:g('shares'),reach:g('reach'),updatedAt:new Date().toISOString()};
    const m=el.querySelector('.resmsg');if(!db){m.textContent='Can’t save in this view.';return}
    try{await db.doc('posts/'+id).update({results:p.results});m.textContent='Saved. See the Insights tab.'}catch(e){m.textContent='Could not save ('+(e.code||'error')+').'}
    renderInsights()});

  function fillFields(){const p=posts[id];const box=el.querySelector('.fields');box.innerHTML='';
    (SCHEMA[p.template]||[]).forEach(([k,kind,label,hint,keys])=>{
      const lab=document.createElement('label');lab.textContent=label;if(hint){const sm=document.createElement('small');sm.textContent=hint;lab.appendChild(sm)}
      const inp=kind==='text'?document.createElement('input'):document.createElement('textarea');
      if(kind==='text')inp.type='text';else inp.rows=Math.max(2,((p.fields||{})[k]||[]).length);
      inp.id='f-'+id+'-'+k;inp.value=fieldToText((p.fields||{})[k],kind,keys);
      inp.addEventListener('input',()=>{p.fields={...(p.fields||{}),[k]:textToField(inp.value,kind,keys)};el._nav();el._redraw();clearTimeout(inp._t);inp._t=setTimeout(()=>save(id,{fields:p.fields}),800)});
      lab.appendChild(inp);box.appendChild(lab)})}
  el._fillFields=fillFields;
  return el;
}

function fillNode(el,id){
  const p=posts[id];const sig=JSON.stringify(p);if(el._sig===sig)return;el._sig=sig;
  el.classList.toggle('done',p.status==='posted');
  el.querySelector('.when').textContent=[p.when,p.format].filter(Boolean).join(' · ');
  el.querySelector('h3').textContent=p.title||'';el.querySelector('.why').textContent=p.why||'';
  SLOTS(p).forEach(k=>{const f=el.querySelector('.find-'+k);if(!f)return;const s=searchFor(p,k);const term=s.term||p.title||'';
    f.querySelector('.q').textContent=term;f.querySelector('.g').href='https://www.google.com/search?tbm=isch&tbs=isz:l&q='+encodeURIComponent(term);
    f.querySelector('.w').href='https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent(term)+'&title=Special:MediaSearch&type=image';
    f.querySelector('.hint2').textContent=s.tip||'';
    const th=el.querySelector('.slot-'+k+' .thumb');if(p[k]&&p[k].id&&!localImg[id+':'+k]){fetch('/_blob/'+p[k].id).then(r=>r.ok?r.blob():null).then(b=>{if(b){th.src=URL.createObjectURL(b);th.hidden=false}}).catch(()=>{})}});
  const ready=SLOTS(p).some(k=>p[k]&&p[k].ready&&(p[k].id||localImg[id+':'+k]))||['carousel','goal','result','h2h'].includes(p.template);
  el.querySelector('.after').hidden=!ready;el.querySelector('.tt').hidden=!ready;el.querySelector('.kl').hidden=!ready;el.querySelector('.pk').hidden=!ready;
  el.querySelector('.mark').textContent=p.status==='posted'?'Move back to To post':'Mark as posted';
  if(!el.contains(document.activeElement)){
    el.querySelector('.cap').value=p.caption||'';el.querySelector('.pin').value=p.pinned||pinnedDefault(id);
    const r=p.results||{};['comments','reactions','shares','reach'].forEach(c=>{el.querySelector('.r-'+c).value=r[c]==null?'':r[c]});
    el._sliders();el._fillFields();el._fillTT(false);el._pkShow();el._hf();
  }
  const src=el.querySelector('.sources');src.innerHTML='';
  if(p.sources&&p.sources.length){src.append('Sources: ');p.sources.forEach((s,i)=>{const a=document.createElement('a');a.href=s.u;a.target='_blank';a.rel='noopener';a.textContent=s.t||s.u;src.append(a);if(i<p.sources.length-1)src.append(' · ')})}
  el._nav();el._redraw();
}

function renderList(){
  const list=$('#list');
  const ids=order.filter(id=>filter==='all'||(filter==='posted'?posts[id].status==='posted':posts[id].status!=='posted'));
  list.innerHTML='';
  if(!ids.length){list.innerHTML='<p class="empty">'+(order.length?(filter==='posted'?'Nothing marked as posted yet.':'All caught up. New posts arrive with the next news check, or make one in the Create tab.'):'No posts yet.')+'</p>';return}
  let last=null;
  for(const id of ids){const p=posts[id];
    if(p.batchLabel!==last){const h=document.createElement('div');h.className='batch';h.textContent=p.batchLabel||'Posts';list.appendChild(h);last=p.batchLabel}
    if(!nodes[id]||nodes[id]._tpl!==p.template){nodes[id]=buildNode(id);nodes[id]._tpl=p.template}list.appendChild(nodes[id]);fillNode(nodes[id],id)}
}
function showModal(url){const m=document.createElement('div');m.className='modal';m.innerHTML='<div><img alt="Finished post image"><p>Press and hold (phone) or right-click (computer) to save the image. Tap anywhere to close.</p></div>';m.querySelector('img').src=url;m.addEventListener('click',()=>m.remove());document.body.appendChild(m)}
function fmtTime(iso){try{return new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return iso}}
function setStatus(extra){
  const todo=order.filter(id=>posts[id].status!=='posted').length;
  let s='<b>'+todo+'</b> post'+(todo===1?'':'s')+' ready to go.';
  if(meta&&meta.lastRefresh)s+=' Last news check: <b>'+esc(fmtTime(meta.lastRefresh))+'</b>.';
  if(meta&&meta.nextRun)s+=' Next: '+esc(meta.nextRun)+'.';
  if(extra)s+='<br>'+extra;$('#status').innerHTML=s;
}
function applySnapshot(snap){
  const next={};snap.docs.forEach(d=>{next[d.id]=JSON.parse(JSON.stringify(d.data()))});
  for(const id in next){if(!posts[id])continue;for(const k of ['photo','photo2']){if(localImg[id+':'+k]&&posts[id][k]&&!posts[id][k].id&&!(next[id][k]&&next[id][k].id))next[id][k]=posts[id][k]}}
  posts=next;
  order=Object.keys(posts).sort((a,b)=>{const A=posts[a],B=posts[b];if((A.batch||'')!==(B.batch||''))return (B.batch||'')<(A.batch||'')?-1:1;
    const am=/^Made/.test(A.batchLabel||'')?0:1,bm=/^Made/.test(B.batchLabel||'')?0:1;if(am!==bm)return am-bm;return (A.order||0)-(B.order||0)});
  renderList();setStatus();renderInsights();try{fillPostSelects()}catch(e){}try{studioRefresh()}catch(e){}
}

// ---------- create tab ----------
async function createPost(doc,msgEl){
  if(!db){msgEl.textContent='Posts can only be saved inside Claude.';return null}
  const id=todayISO()+'-'+slug(doc.title)+'-'+Math.random().toString(36).slice(2,6);
  const full={order:-Math.round(Date.now()/1000),batch:todayISO(),batchLabel:'Made in Studio · '+dayLabel(),when:'Post now',status:'todo',sources:[],photo:{ready:false,id:null,zoom:1,dx:0,dy:0},...doc};
  if(!full.slot&&full.when==='Post now')full.slot=new Date().toISOString();
  if(full.caption){try{full.caption=stripTags(full.caption)+'\n\n'+tagsFor(full,'facebook').join(' ')}catch(e){}}
  try{await db.doc('posts/'+id).set(full);msgEl.textContent='Done. It’s at the top of your Posts tab.';
    showTab('posts');filter='todo';document.querySelectorAll('[data-f]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.f==='todo')));
    setTimeout(()=>{const n=nodes[id];if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},700);return id}
  catch(e){msgEl.textContent=e.code==='quota_exceeded'?'The app is full. Delete some old posts first.':'Could not save ('+(e.code||'error')+').';return null}
}
const lines=t=>String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);
function fillColours(){['#s-ac','#s-bc','#h-ac','#h-bc'].forEach((s,i)=>{const el=$(s);el.innerHTML=Object.keys(SIDE).map(k=>`<option value="${k}">${k[0].toUpperCase()+k.slice(1)}</option>`).join('');el.value=i%2?'blue':'red'})}

$('#c-ft').addEventListener('submit',async e=>{e.preventDefault();const m=$('#ft-msg');
  const sc=$('#ft-score').value.trim().match(/(\d+)\s*[-–:\s]\s*(\d+)/);if(!sc){m.textContent='Type the score like 2-1.';return}
  const home=$('#ft-home').value.trim(),away=$('#ft-away').value.trim(),hs=+sc[1],as=+sc[2],comp=$('#ft-comp').value.trim(),q=$('#ft-q').value.trim();
  const hl=lines($('#ft-hs').value),al=lines($('#ft-as').value);
  const winner=hs>as?home:as>hs?away:null;
  const scor=[hl.length?home+': '+hl.join(', '):'',al.length?away+': '+al.join(', '):''].filter(Boolean).join('\n');
  const cap=`FT: ${home} ${hs}-${as} ${away}${comp?' ('+comp+')':''}\n\n${scor?scor+'\n\n':''}${q||'Who was your man of the match?'} 👇\n\n#${slug(home).replace(/-/g,'')} #${slug(away).replace(/-/g,'')} #PunditBible`;
  await createPost({title:`${home} ${hs}-${as} ${away}`,format:'Full-time result',why:'Being first with the score gets the most shares on match day.',template:'result',theme:'brand',
    fields:{tag:U(comp||'FULL TIME'),home,away,hs,as,homeScorers:hl,awayScorers:al,question:q},caption:cap,
    photoSearch:{term:(winner||home)+' players celebrate',tip:winner?'A celebration shot from this game if you can find one.':'A shot from this game, or the two captains.'}},m);
  e.target.reset();$('#ft-q').value='Who was your man of the match?'});

$('#c-split').addEventListener('submit',async e=>{e.preventDefault();const m=$('#s-msg');
  const a=$('#s-an').value.trim(),b=$('#s-bn').value.trim(),as=$('#s-as').value.trim(),bs=$('#s-bs').value.trim(),title=$('#s-title').value.trim()||"Who's better?",q=$('#s-q').value.trim();
  await createPost({title:`${a} v ${b}`,format:"Who's better?",why:'Pure opinion: everyone has an answer and fans of both sides pile in.',template:'split',theme:'brand',
    fields:{tag:'THE DEBATE',title,aName:a,aSub:as,bName:b,bSub:bs,aColor:$('#s-ac').value,bColor:$('#s-bc').value,question:q},
    caption:`${a} or ${b}? ${title.replace(/\?$/,'')}… 🤔\n\nA: ${a}${as?' ('+as+')':''}\nB: ${b}${bs?' ('+bs+')':''}\n\n${q||'A or B?'} 👇\n\n#PunditBible`,
    photo2:{ready:false,id:null,zoom:1,dx:0,dy:0},
    photoSearch:{term:a+(as?' '+as:''),tip:'Head and shoulders, face clearly visible.'},photoSearch2:{term:b+(bs?' '+bs:''),tip:'Head and shoulders, face clearly visible.'}},m);
  e.target.reset();$('#s-title').value="Who's better?";$('#s-q').value='A or B? One letter.';fillColours()});

$('#c-rat').addEventListener('submit',async e=>{e.preventDefault();const m=$('#r-msg');
  const rows=lines($('#r-rows').value).map(l=>{const [n,s]=l.split('|').map(x=>x.trim());return {name:n,score:s||''}}).filter(r=>r.name).slice(0,12);
  if(!rows.length){m.textContent='Add at least one player.';return}
  const title=$('#r-title').value.trim(),sub=$('#r-sub').value.trim(),q=$('#r-q').value.trim();
  const best=[...rows].sort((a,b)=>(+b.score||0)-(+a.score||0))[0];
  await createPost({title,format:'Player ratings',why:'Everyone thinks the marks are wrong, so they comment to say so.',template:'ratings',theme:'brand',
    fields:{tag:'PLAYER RATINGS',title,subtitle:sub,rows,question:q},
    caption:`${title}${sub?' · '+sub:''}\n\n${rows.map(r=>r.name+' '+r.score).join('\n')}\n\n${q||'Who have we got wrong?'} 👇\n\n#PunditBible`,
    photoSearch:{term:best?best.name:title,tip:'Your man of the match, close-up, celebrating if possible.'}},m);
  e.target.reset();$('#r-q').value='Who have we got wrong?'});

$('#c-car').addEventListener('submit',async e=>{e.preventDefault();const m=$('#k-msg');
  const items=lines($('#k-rows').value).map(l=>{const i=l.indexOf('|');return i<0?{name:l,line:''}:{name:l.slice(0,i).trim(),line:l.slice(i+1).trim()}}).filter(x=>x.name).slice(0,10);
  if(!items.length){m.textContent='Add at least one item.';return}
  const title=$('#k-title').value.trim(),q=$('#k-q').value.trim();
  await createPost({title,format:'Carousel',why:'People swipe through every slide, so they stay on the post longer and Facebook shows it to more people.',template:'carousel',theme:'brand',
    fields:{tag:'',title,items,question:q},
    caption:`${title} 👀 Swipe through ➡️\n\n${items.map((x,i)=>(i+1)+'. '+x.name).join('\n')}\n\n${q||'Who did we miss?'} 👇\n\n#PunditBible`,
    photoSearch:{term:items[0].name,tip:'For the cover. A strong close-up of the first name on the list.'}},m);
  e.target.reset();$('#k-q').value='Who did we miss?'});

$('#c-article').addEventListener('submit',async e=>{e.preventDefault();const m=$('#a-msg'),b=e.target.querySelector('button');
  const txt=$('#a-text').value.trim(),link=$('#a-link').value.trim();if(!txt){m.textContent='Paste something first.';return}
  if(!sample){m.textContent='This needs Claude, which isn’t available in this view.';return}
  b.disabled=true;m.textContent='Claude is writing your post… (up to a minute)';
  try{const r=await askJSON(`You create posts for Pundit Bible, a UK football Facebook page whose goal is comments and shares. Turn the pasted text below into ONE post.

STRICT: use only facts, numbers and quotes that appear in the pasted text. Quotes must be copied word for word. Do not add anything from memory.

Pick the template that will get the most comments:
- quote: fields {tag, quote:[2-4 short lines of a real quote from the text, ~12 chars each], speaker, context (one line), question}
- headline: fields {tag, lines:[{t, c}] 2-3 short punchy lines, c is white|gold|red|accent, body (one sentence), question}
- stat: fields {tag, label, big (e.g. "£677.6M"), rows:[{label, value, c}] up to 3, c is red|gold|grey|white, question}
- list: fields {tag, title (very short e.g. "5 OUT"), items:[up to 6 names], body, question}
- poll: fields {tag, title1, title2, options:[{name, sub}] exactly 4, question}
tag is a short upper-case label like "SPURS · BOTTOM OF THE LEAGUE". question is the yellow bar on the image: max 40 characters, easy to answer.

Reply with only JSON:
{"title":"short title","format":"Hot quote|Stat shock|News card|A/B/C/D poll|Headline","why":"1 sentence on why it will get comments","template":"...","theme":"red|maroon|charcoal|navy|sky|green|england|purple (suit the club colours)","fields":{...},"caption":"hook line, 2-4 short lines of context, one clear question, then EXACTLY 3 hashtags on the last line: one broad (#Football, or #Boxing for boxing), one for the club or player (their most-used tag, e.g. #LFC, #ManUtd, #Haaland), one for the post type or competition (e.g. #PremierLeague, #ChampionsLeague, #FootballDebate); max 2 emojis; never 'like if', 'share if', 'tag a mate' or 'type YES'","photoSearch":{"term":"2-5 word Google Images search for the main person, e.g. 'Roberto De Zerbi Tottenham touchline'","tip":"one short sentence on the shot to pick"}}

Pasted text:
"""
${txt.slice(0,20000)}
"""`,{cache:false});
    const ok=r&&typeof r==='object'&&['quote','headline','stat','list','poll'].includes(r.template)&&r.fields&&typeof r.caption==='string';
    if(!ok){m.textContent='The answer didn’t come back in the right shape. Press Make post again.';b.disabled=false;return}
    const doc={title:String(r.title||'New post'),format:String(r.format||TPL_NAME[r.template]),why:String(r.why||''),template:r.template,theme:THEMES[r.theme]?r.theme:'charcoal',fields:r.fields,caption:r.caption,
      photoSearch:{term:String((r.photoSearch&&r.photoSearch.term)||r.title||''),tip:String((r.photoSearch&&r.photoSearch.tip)||'')},sources:link?[{t:'Source',u:link}]:[]};
    const id=await createPost(doc,m);if(id){$('#a-text').value='';$('#a-link').value=''}
  }catch(err){m.textContent=sampleErr(err)}b.disabled=false});

// ---------- insights ----------
function renderInsights(){
  const withR=order.map(id=>posts[id]).filter(p=>p.results&&(p.results.comments!=null||p.results.reach!=null));
  const k=$('#kpis');if(!k)return;
  const sum=(a,f)=>a.reduce((s,p)=>s+(+((p.results||{})[f])||0),0);
  const n=withR.length;
  k.innerHTML=[['Posts tracked',n],['Avg comments',n?Math.round(sum(withR,'comments')/n):'–'],['Avg shares',n?Math.round(sum(withR,'shares')/n):'–'],['Avg reach',n?Math.round(sum(withR,'reach')/n).toLocaleString('en-GB'):'–']]
    .map(([l,v])=>`<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
  function group(keyFn){const g={};withR.forEach(p=>{const key=keyFn(p)||'Other';(g[key]=g[key]||[]).push(p)});
    return Object.entries(g).map(([key,a])=>{const reach=sum(a,'reach');return {key,n:a.length,c:sum(a,'comments')/a.length,r:sum(a,'reactions')/a.length,s:sum(a,'shares')/a.length,reach:reach/a.length,per:reach?sum(a,'comments')/reach*1000:null}}).sort((a,b)=>b.c-a.c)}
  const table=(el,rows,label)=>{el.innerHTML=`<thead><tr><th>${label}</th><th class="n">Posts</th><th class="n">Avg comments</th><th class="n">Avg reactions</th><th class="n">Avg shares</th><th class="n">Avg reach</th><th class="n">Comments per 1k reach</th></tr></thead><tbody>`+
    (rows.length?rows.map(r=>`<tr><td>${esc(r.key)}</td><td class="n">${r.n}</td><td class="n">${Math.round(r.c)}</td><td class="n">${Math.round(r.r)}</td><td class="n">${Math.round(r.s)}</td><td class="n">${Math.round(r.reach).toLocaleString('en-GB')}</td><td class="n">${r.per==null?'–':r.per.toFixed(1)}</td></tr>`).join(''):'<tr><td colspan="7" class="msg">No results logged yet.</td></tr>')+'</tbody>'};
  table($('#t-format'),group(p=>p.format||TPL_NAME[p.template]),'Format');
  table($('#t-time'),group(p=>{const m=String(p.when||'').match(/\d{1,2}:\d{2}/);if(m)return m[0];if(p.postedAt){const d=new Date(p.postedAt);return String(d.getHours()).padStart(2,'0')+':00 (approx)'}return null}),'Time');
  const top=[...withR].sort((a,b)=>(+b.results.comments||0)-(+a.results.comments||0)).slice(0,10);
  $('#t-top').innerHTML='<thead><tr><th>Post</th><th>Format</th><th class="n">Comments</th><th class="n">Shares</th><th class="n">Reach</th></tr></thead><tbody>'+
    (top.length?top.map(p=>`<tr><td>${esc(p.title)}</td><td>${esc(p.format||'')}</td><td class="n">${p.results.comments??'–'}</td><td class="n">${p.results.shares??'–'}</td><td class="n">${p.results.reach!=null?(+p.results.reach).toLocaleString('en-GB'):'–'}</td></tr>`).join(''):'<tr><td colspan="5" class="msg">No results logged yet.</td></tr>')+'</tbody>';
}
$('#review-btn').addEventListener('click',async()=>{const m=$('#review-msg'),out=$('#review'),b=$('#review-btn');
  const rows=order.map(id=>posts[id]).filter(p=>p.results).slice(0,80).map(p=>({title:p.title,format:p.format,template:p.template,when:p.when,postedAt:p.postedAt,...p.results}));
  if(rows.length<3){m.textContent='Log results on at least 3 posts first.';return}
  if(!sample){m.textContent='This needs Claude, which isn’t available in this view.';return}
  b.disabled=true;m.textContent='';out.textContent='Thinking…';
  try{await sample(`You are the social media coach for Pundit Bible, a UK football Facebook page. The goal is more comments and shares. Here are results for recent image posts (JSON):
${JSON.stringify(rows).slice(0,30000)}

Write a short weekly review in plain English for the page owner (no jargon, no markdown headings, under 220 words):
1. What worked best and why (formats, topics, times).
2. What to stop or change.
3. Exactly what to post more of next week: 3 specific ideas.
Base everything on the numbers above; say so if there's too little data to be sure.`,{cache:false,onText:({text})=>{out.textContent=text}})}
  catch(e){out.textContent=e.text||'';m.textContent=sampleErr(e)}b.disabled=false});
$('#set-save').addEventListener('click',async()=>{const v=$('#set-link').value.trim();const m=$('#set-msg');settings.affiliateLink=v;
  if(!db){m.textContent='Can’t save in this view.';return}try{await db.doc('meta/settings').set({affiliateLink:v});m.textContent='Saved. New pinned comments will use this link.'}catch(e){m.textContent='Could not save ('+(e.code||'error')+').'}});


// ---------- breaking news ----------
let breaking={},bmeta=null,bfilter='all';
function ago(iso){const t=Date.parse(iso);if(!isFinite(t))return '';const m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+'h '+(m%60?m%60+'m ':'')+'ago';const d=Math.floor(h/24);return d+' day'+(d>1?'s':'')+' ago'}
const TREND={'just-broke':'⚡ Just broke','rising':'📈 Rising','trending':'🔥 Trending'};
function renderBreaking(){
  const list=$('#blist');if(!list)return;
  const items=Object.entries(breaking).map(([id,b])=>({id,...b})).filter(b=>bfilter==='all'||(bfilter==='Football'?b.sport==='Football':b.sport!=='Football'))
    .sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  const recent=Object.values(breaking).filter(b=>Date.now()-(Date.parse(b.publishedAt)||0)<3*3600e3).length;
  $('#bcount').textContent=recent?String(recent):'';
  let st='';
  if(bmeta&&bmeta.scannedAt){const next=new Date((Date.parse(bmeta.scannedAt)||Date.now())+60*60000);
    st=window.PB?('Last scan <b>'+esc(ago(bmeta.scannedAt))+'</b>. '+esc(window.PB.scanNote||'')):('Last scan <b>'+esc(ago(bmeta.scannedAt))+'</b>. Next scan about <b>'+next.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</b> (every hour, 7am–11pm). Need it this second? Message Claude: <b>“breaking news scan”</b>.')}
  else st=window.PB?'The first scan hasn’t run yet. '+esc(window.PB.scanNote||''):'The first scan hasn’t run yet. Scans run every hour from 7am to 11pm.';
  $('#bstatus').innerHTML=st;
  if(window.PB&&window.PB.scan){const b=document.createElement('button');b.type='button';b.textContent='Scan now';b.style.marginLeft='8px';b.className='ghost';b.onclick=async()=>{b.disabled=true;b.textContent='Starting…';try{await window.PB.scan('breaking');b.textContent='Scanning… (2–3 min)'}catch(e){b.textContent=e.message||'Couldn’t start';b.disabled=false}};$('#bstatus').appendChild(b)}
  list.innerHTML='';
  if(!items.length){list.innerHTML='<p class="empty">Nothing breaking right now. The next scan will check again.</p>';return}
  for(const b of items){
    const el=document.createElement('article');const tr=TREND[b.trend]?b.trend:'rising';el.className='bitem '+tr;
    const heat=Math.max(0,Math.min(5,Math.round(+b.heat||0)));
    el.innerHTML=`<div class="bmeta"><span class="tchip ${tr}">${TREND[tr]}</span><span class="chip">${esc(b.sport||'Sport')}</span>
      <span class="heat" title="How much your audience will comment">${[1,2,3,4,5].map(i=>`<i class="${i<=heat?'on':''}"></i>`).join('')}</span>
      <span class="ago" data-ago="${esc(b.publishedAt||'')}">Broke ${esc(ago(b.publishedAt))}</span>${b.outlets?`<span class="ago">· ${esc(b.outlets)} outlet${b.outlets>1?'s':''}</span>`:''}</div>
      <h3></h3><p class="sum"></p>
      ${b.heatWhy?'<div class="angle"><b>Why it’ll get comments:</b> <span class="hw"></span></div>':''}
      ${b.angle?'<div class="angle"><b>Best angle:</b> <span class="an"></span></div>':''}
      <details><summary>Facts and quotes</summary><ul class="facts"></ul><div class="qs" style="display:grid;gap:6px;margin-top:8px"></div></details>
      <div class="sources"></div>
      <div class="row"><button class="mk" type="button">${b.madeAt?'Make another post':'Make post now'}</button><span class="msg bm">${b.madeAt?'Post made '+esc(ago(b.madeAt))+'.':''}</span></div>`;
    el.querySelector('h3').textContent=b.headline||'';el.querySelector('.sum').textContent=b.summary||'';
    if(b.heatWhy)el.querySelector('.hw').textContent=b.heatWhy;if(b.angle)el.querySelector('.an').textContent=b.angle;
    const ul=el.querySelector('.facts');(b.facts||[]).forEach(f=>{const li=document.createElement('li');li.textContent=f;ul.appendChild(li)});
    const qs=el.querySelector('.qs');(b.quotes||[]).forEach(q=>{const bq=document.createElement('blockquote');bq.textContent='“'+(q.text||'')+'” — '+(q.who||'');qs.appendChild(bq)});
    const src=el.querySelector('.sources');if(b.sources&&b.sources.length){src.append('Sources: ');b.sources.forEach((s,i)=>{const x=document.createElement('a');x.href=s.u;x.target='_blank';x.rel='noopener';x.textContent=s.t||s.u;src.append(x);if(i<b.sources.length-1)src.append(' · ')})}
    el.querySelector('.mk').addEventListener('click',async()=>{const m=el.querySelector('.bm');const pst=b.post;
      if(!pst||!pst.template||!pst.fields){m.textContent='This story has no ready post. Use Create → Make a post from this with the facts above.';return}
      const doc={...pst,theme:THEMES[pst.theme]?pst.theme:'brand',batchLabel:'Breaking · '+dayLabel(),when:'Post now',sources:b.sources||[],order:-Math.round(Date.now()/1000)};
      if(doc.template==='split')doc.photo2={ready:false,id:null,zoom:1,dx:0,dy:0};
      const id=await createPost(doc,m);
      if(id&&db){try{await db.doc('breaking/'+b.id).update({madeAt:new Date().toISOString()})}catch(e){}}});
    list.appendChild(el);
  }
}
document.querySelectorAll('[data-bf]').forEach(b=>b.onclick=()=>{bfilter=b.dataset.bf;document.querySelectorAll('[data-bf]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderBreaking()});
setInterval(()=>{document.querySelectorAll('[data-ago]').forEach(s=>{s.textContent='Broke '+ago(s.dataset.ago)});if(!$('#view-breaking').hidden&&bmeta)renderBreaking()},60000);

// ---------- create: guess + head to head ----------
$('#c-guess').addEventListener('submit',async e=>{e.preventDefault();const m=$('#g-msg');
  const ans=$('#g-ans').value.trim(),clues=lines($('#g-clues').value).slice(0,4),line=$('#g-line').value.trim(),q=$('#g-q').value.trim();
  if(!clues.length){m.textContent='Add at least one clue.';return}
  await createPost({title:'Guess the player: '+ans,format:'Guess the player',why:'Everyone wants to prove they know it. Guesses pile up, and the answer tomorrow brings them back.',template:'guess',theme:'brand',
    fields:{tag:'GUESS THE PLAYER',clues,answer:ans,answerLine:line,question:q,revealQuestion:'Did you get it?'},
    caption:`GUESS THE PLAYER 🔎\n\n${clues.map((c,i)=>(i+1)+'. '+c).join('\n')}\n\n${q||'Name him in the comments'} 👇 Answer tomorrow.\n\n#GuessThePlayer #Football #PunditBible`,
    photoSearch:{term:ans,tip:'A clear photo of him. The app hides it on the quiz slide and shows it on the answer slide.'}},m);
  e.target.reset();$('#g-q').value='Name him in the comments'});
$('#c-h2h').addEventListener('submit',async e=>{e.preventDefault();const m=$('#h-msg');
  const an=$('#h-an').value.trim(),bn=$('#h-bn').value.trim();
  const rows=lines($('#h-rows').value).map(l=>{const p=l.split('|').map(x=>x.trim());return {label:p[0],a:p[1]||'',b:p[2]||'',low:(p[3]||'').toLowerCase().startsWith('low')?'low':''}}).filter(r=>r.label).slice(0,6);
  if(!rows.length){m.textContent='Add at least one stat.';return}
  const q=$('#h-q').value.trim();
  await createPost({title:`${an} v ${bn}: head to head`,format:'Head to head',why:'Numbers start arguments: fans of both defend their player with stats of their own.',template:'h2h',theme:'brand',
    fields:{tag:$('#h-tag').value.trim()||'HEAD TO HEAD',aName:an,bName:bn,aColor:$('#h-ac').value,bColor:$('#h-bc').value,rows,question:q},
    caption:`${an} or ${bn}? The numbers 📊\n\n${rows.map(r=>`${r.label}: ${r.a} v ${r.b}`).join('\n')}\n\n${q||'Who would you rather have?'} 👇\n\n#PunditBible`,
    photo2:{ready:false,id:null,zoom:1,dx:0,dy:0},photoSearch:{term:an,tip:'Head and shoulders, face clearly visible.'},photoSearch2:{term:bn,tip:'Head and shoulders, face clearly visible.'}},m);
  e.target.reset();$('#h-tag').value='HEAD TO HEAD';$('#h-q').value='Who would you rather have?';fillColours()});

// ---------- match day ----------
let fixtures={};
function fxDateLabel(d){const t=todayISO();const tm=new Date(Date.now()+864e5);const tmS=tm.getFullYear()+'-'+String(tm.getMonth()+1).padStart(2,'0')+'-'+String(tm.getDate()).padStart(2,'0');
  if(d===t)return 'Today';if(d===tmS)return 'Tomorrow';try{return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}catch(e){return d}}
function scorerLines(fx,side){return (fx.goals||[]).filter(g=>g.side===side).map(g=>g.scorer+(g.min?' '+String(g.min).replace(/[^0-9+]/g,'')+'′':''))}
async function fxSave(id,patch){fixtures[id]={...fixtures[id],...patch};renderMatch();if(db)try{await db.doc('fixtures/'+id).update(patch)}catch(e){}}
function renderMatch(){
  const list=$('#mlist');if(!list)return;const t=todayISO();
  const ids=Object.keys(fixtures).filter(id=>(fixtures[id].date||'')>=t||fixtures[id].status==='live').sort((a,b)=>((fixtures[a].date||'')+(fixtures[a].ko||'')).localeCompare((fixtures[b].date||'')+(fixtures[b].ko||'')));
  list.innerHTML='';if(!ids.length){list.innerHTML='<p class="empty">No fixtures yet. Add one above; the morning news check also adds the next fortnight’s big games.</p>';return}
  let last=null;
  for(const id of ids){const fx=fixtures[id];
    if(fx.date!==last){const h=document.createElement('div');h.className='mdate';h.textContent=fxDateLabel(fx.date);list.appendChild(h);last=fx.date}
    const el=document.createElement('article');el.className='fx '+(fx.status||'');
    const hs=fx.hs||0,as=fx.as||0;
    el.innerHTML=`<div class="fxhead"><span>${esc(fx.comp||'')}</span><span>${fx.status==='live'?'<b style="color:var(--red)">LIVE</b> · ':fx.status==='ft'?'FULL TIME · ':''}KO ${esc(fx.ko||'')}</span></div>
      <div class="score"><b>${esc(fx.home)}</b><span class="sc">${hs}–${as}</span><b>${esc(fx.away)}</b></div>
      <div class="goals">${(fx.goals||[]).length?'⚽ '+(fx.goals||[]).map(g=>esc(g.scorer)+(g.min?' '+esc(g.min)+'′':'')+' ('+esc(g.side==='home'?fx.home:fx.away)+')').join(', '):'No goals yet.'}</div>
      <div class="goalrow"><div class="side" role="group" aria-label="Which team scored"><button class="ghost sh" data-side="home" aria-pressed="true" type="button">${esc(fx.home)}</button><button class="ghost sa" data-side="away" aria-pressed="false" type="button">${esc(fx.away)}</button></div>
        <input type="text" class="gs" placeholder="Scorer" aria-label="Scorer" id="gs-${esc(id)}"><input type="text" class="gm" placeholder="Min" inputmode="numeric" aria-label="Minute" id="gm-${esc(id)}"><button class="gbtn" type="button">⚽ GOAL card</button></div>
      <div class="row"><button class="ghost ht" type="button">Half-time card</button><button class="ghost ftb" type="button">Full-time card</button><button class="ghost undo" type="button">Undo last goal</button><button class="ghost del" type="button">Remove match</button><span class="msg mm"></span></div>`;
    let side='home';el.querySelectorAll('.side button').forEach(b=>b.onclick=()=>{side=b.dataset.side;el.querySelectorAll('.side button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
    const mm=el.querySelector('.mm');
    const base={batchLabel:'Live · '+fx.home+' v '+fx.away,when:'Post now',theme:'brand'};
    el.querySelector('.gbtn').onclick=async()=>{const sc=el.querySelector('.gs').value.trim(),mi=el.querySelector('.gm').value.trim();if(!sc){mm.textContent='Type the scorer first.';return}
      const goals=[...(fx.goals||[]),{side,scorer:sc,min:mi}];const nhs=hs+(side==='home'?1:0),nas=as+(side==='away'?1:0);
      await fxSave(id,{goals,hs:nhs,as:nas,status:'live'});const team=side==='home'?fx.home:fx.away;
      await createPost({...base,title:`GOAL: ${sc} ${mi?mi+"'":''} (${fx.home} ${nhs}-${nas} ${fx.away})`,format:'Goal!',why:'Speed wins: first with the goal gets the shares.',template:'goal',
        fields:{tag:U(fx.comp||'GOAL'),scorer:sc,minute:mi,home:fx.home,away:fx.away,hs:nhs,as:nas,question:'Who scores next?'},
        caption:`GOAL! ⚽ ${sc}${mi?' '+mi+"'":''}\n\n${fx.home} ${nhs}-${nas} ${fx.away}\n\nWho scores next? 👇\n\n#${slug(fx.home).replace(/-/g,'')} #${slug(fx.away).replace(/-/g,'')} #PunditBible`,
        photoSearch:{term:sc+' '+team+' celebration',tip:'A celebration shot. Optional: the card works without a photo.'}},mm)};
    const resultCard=async(label,q)=>{const hsl=scorerLines(fx,'home'),asl=scorerLines(fx,'away');
      await createPost({...base,title:`${label==='HALF-TIME'?'HT':'FT'}: ${fx.home} ${hs}-${as} ${fx.away}`,format:label==='HALF-TIME'?'Half-time':'Full-time result',why:'Fast score cards get shared on match day.',template:'result',
        fields:{tag:U(fx.comp||label),label,home:fx.home,away:fx.away,hs,as,homeScorers:hsl,awayScorers:asl,question:q},
        caption:`${label==='HALF-TIME'?'HT':'FT'}: ${fx.home} ${hs}-${as} ${fx.away}${fx.comp?' ('+fx.comp+')':''}\n\n${[hsl.length?fx.home+': '+hsl.join(', '):'',asl.length?fx.away+': '+asl.join(', '):''].filter(Boolean).join('\n')}${hsl.length||asl.length?'\n\n':''}${q} 👇\n\n#${slug(fx.home).replace(/-/g,'')} #${slug(fx.away).replace(/-/g,'')} #PunditBible`,
        photoSearch:{term:(hs>as?fx.home:as>hs?fx.away:fx.home)+' players',tip:'Optional: the card works without a photo.'}},mm)};
    el.querySelector('.ht').onclick=()=>resultCard('HALF-TIME','What changes at half-time?');
    el.querySelector('.ftb').onclick=async()=>{await fxSave(id,{status:'ft'});resultCard('FULL TIME','Who was your man of the match?')};
    el.querySelector('.undo').onclick=()=>{const g=[...(fx.goals||[])];const lg=g.pop();if(!lg){mm.textContent='No goals to undo.';return}fxSave(id,{goals:g,hs:Math.max(0,hs-(lg.side==='home'?1:0)),as:Math.max(0,as-(lg.side==='away'?1:0))})};
    el.querySelector('.del').onclick=async()=>{delete fixtures[id];renderMatch();if(db)try{await db.doc('fixtures/'+id).delete()}catch(e){}};
    list.appendChild(el)}
}
$('#m-add').addEventListener('submit',async e=>{e.preventDefault();const m=$('#m-msg');
  const home=$('#m-home').value.trim(),away=$('#m-away').value.trim(),date=$('#m-date').value,ko=$('#m-ko').value,comp=$('#m-comp').value.trim();
  const id=date+'-'+slug(home)+'-v-'+slug(away);const doc={date,ko,home,away,comp,hs:0,as:0,goals:[],status:'upcoming'};
  fixtures[id]=doc;renderMatch();if(db){try{await db.doc('fixtures/'+id).set(doc);m.textContent='Added.'}catch(err){m.textContent='Could not save ('+(err.code||'error')+').'}}
  e.target.reset();$('#m-date').value=todayISO();$('#m-ko').value='15:00'});
// ---------- tabs ----------
const TABS=['home','posts','calendar','create','library','match','breaking','tables','video','insights','play','settings'];
const TAB_TITLES={home:'Home',posts:'Posts',calendar:'Calendar',create:'Create',library:'Photo library',match:'Match Centre',breaking:'Breaking news',tables:'Tables & fixtures',video:'Video tools',insights:'Insights',play:'Playbook',settings:'Settings'};
let curTab='home';
function showTab(t,keepHash){if(!TABS.includes(t))t='home';curTab=t;TABS.forEach(x=>{const v=$('#view-'+x);if(v)v.hidden=x!==t;const b=$('#tab-'+x);if(b)b.setAttribute('aria-pressed',String(x===t))});
  document.querySelectorAll('.bottombar [data-go]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.go===t||(t!=='home'&&t!=='posts'&&t!=='match'&&t!=='create'&&false))));
  const mb=$('#more-btn');if(mb)mb.setAttribute('aria-pressed',String(!['home','posts','match','create'].includes(t)));
  const ms=$('#moresheet');if(ms)ms.hidden=true;$('#pagetitle').textContent=TAB_TITLES[t]||'';document.title=(TAB_TITLES[t]||'Studio')+' · Pundit Bible Studio';
  if(t==='insights')renderInsights();if(t==='breaking')renderBreaking();if(t==='match')renderMatch();
  if(typeof studioShow==='function')studioShow(t);
  if(!keepHash)try{history.replaceState(null,'','#'+t)}catch(e){}window.scrollTo(0,0)}
TABS.forEach(t=>{const b=$('#tab-'+t);if(b)b.onclick=()=>showTab(t)});
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-go]');if(g){e.preventDefault();showTab(g.dataset.go)}});
$('#more-btn').onclick=()=>{$('#moresheet').hidden=!$('#moresheet').hidden};$('#moresheet').addEventListener('click',e=>{if(e.target.id==='moresheet')$('#moresheet').hidden=true});
document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll('[data-f]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderList()});
$('#refresh').onclick=async()=>{
  const b=$('#refresh');if(!db){$('#status').textContent='Posts only load inside Claude.';return}
  b.disabled=true;b.textContent='Checking…';
  try{const [ps,m]=await Promise.all([db.collection('posts').get(),db.doc('meta/status').get()]);meta=m.exists?m.data():meta;applySnapshot(ps);
    setStatus('New posts are researched from the latest news every morning at 7am. For a post right now, use <b>Create → Make a post from this</b>.');
    if(window.PB&&window.PB.scan){const g=document.createElement('button');g.type='button';g.className='ghost';g.textContent='Research new posts now';g.style.marginTop='8px';g.onclick=async()=>{g.disabled=true;g.textContent='Starting…';try{await window.PB.scan('morning');g.textContent='Researching… new posts in about 5 minutes'}catch(e){g.textContent=e.message||'Couldn’t start';g.disabled=false}};$('#status').appendChild(document.createElement('br'));$('#status').appendChild(g)}}
  catch(e){$('#status').textContent='Could not refresh ('+(e.code||'error')+'). Try again in a moment.'}
  b.disabled=false;b.textContent='Refresh posts';
};

window.__onLogo=()=>Object.values(nodes).forEach(n=>n._redraw&&n._redraw());
if(LOGO_OK)window.__onLogo();
(async()=>{
  fillColours();try{$('#m-date').value=todayISO()}catch(e){}$('#set-link').value=settings.affiliateLink;
  try{await Promise.all([document.fonts.load(ANTON(100)),document.fonts.load(BB(50)),document.fonts.load(BM(38))])}catch(e){}
  if(window.__TEST_FIX){fixtures=window.__TEST_FIX;renderMatch()}
  if(window.__TEST_BREAKING){breaking=window.__TEST_BREAKING;bmeta={scannedAt:new Date(Date.now()-12*60000).toISOString()};renderBreaking()}
  if(window.__TEST_POSTS){applySnapshot({docs:Object.entries(window.__TEST_POSTS).map(([id,d])=>({id,data:()=>d}))})}
  if(window.__mk)window.__pb={tagsFor,packDefaults,posts:()=>posts,order:()=>order};
  const c=window.claude;
  if(!c||!c.use){if(!window.__TEST_POSTS)$('#status').textContent='Open this page in Claude to load your posts.';return}
  [db,assets,downloads,sample]=await Promise.all([c.use('db'),c.use('assets'),c.use('downloads'),c.use('sample')]);
  if(sample){try{const l=await sample.limits();canSeeImages=!!(l&&l.images)}catch(e){canSeeImages=false}}
  if(!db){$('#status').textContent='Posts are not available in this view.';return}
  db.collection('posts').onSnapshot(applySnapshot,e=>{$('#status').textContent='Lost connection to your posts ('+e.code+'). Reload the page.'});
  db.doc('meta/status').onSnapshot(s=>{meta=s.exists?s.data():null;setStatus()},()=>{});
  db.collection('fixtures').onSnapshot(s=>{fixtures={};s.docs.forEach(d=>{fixtures[d.id]=JSON.parse(JSON.stringify(d.data()))});renderMatch()},()=>{});
  db.collection('breaking').onSnapshot(s=>{breaking={};s.docs.forEach(d=>{breaking[d.id]=JSON.parse(JSON.stringify(d.data()))});renderBreaking();try{studioRefresh()}catch(e){}},()=>{});
  db.doc('meta/breaking').onSnapshot(s=>{bmeta=s.exists?s.data():null;renderBreaking()},()=>{});
  if(typeof studioBoot==='function')studioBoot();
  db.doc('meta/settings').onSnapshot(s=>{if(s.exists){settings={...settings,...s.data()};if(document.activeElement!==$('#set-link'))$('#set-link').value=settings.affiliateLink||''}},()=>{});
})();
