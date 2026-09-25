// Pundit Bible Studio: standalone backend.
// Gives the app the same window.claude.use(...) interface it had inside Claude,
// backed by your own Supabase project (database, photos, login) and your own Claude API key.
(function(){
  const C=window.PB_CONFIG||{};
  const ready=new Promise(res=>{window.__pbReady=res});
  let sb=null,user=null;

  // ---------- login screen ----------
  function loginScreen(msg){
    let el=document.getElementById('pb-login');
    if(!el){el=document.createElement('div');el.id='pb-login';el.innerHTML=`
      <form>
        <img src="icons/icon-192.png" alt="" width="84" height="84">
        <h1>Pundit <span>Bible</span> Studio</h1>
        <label>Email<input type="email" id="pb-email" autocomplete="username" required></label>
        <label>Password<input type="password" id="pb-pass" autocomplete="current-password" required></label>
        <button type="submit">Sign in</button>
        <p class="pb-lmsg"></p>
      </form>`;document.body.appendChild(el);
      el.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const m=el.querySelector('.pb-lmsg');m.textContent='Signing in…';
        const {data,error}=await sb.auth.signInWithPassword({email:el.querySelector('#pb-email').value.trim(),password:el.querySelector('#pb-pass').value});
        if(error){m.textContent=error.message==='Invalid login credentials'?'That email or password isn’t right.':error.message;return}
        user=data.user;el.remove();window.__pbReady()})}
    el.querySelector('.pb-lmsg').textContent=msg||'';
  }
  function notSetUp(){document.addEventListener('DOMContentLoaded',()=>{const d=document.createElement('div');d.id='pb-login';d.innerHTML='<form><h1>Almost there</h1><p>This copy of the Studio isn’t connected to your database yet. Follow step 5 of the setup guide (the deploy workflow writes the connection details).</p></form>';document.body.appendChild(d)})}

  if(!C.url||!C.key||!window.supabase){notSetUp();window.claude={use:async()=>null};return}
  sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  window.__sb=sb;
  (async()=>{const {data}=await sb.auth.getSession();if(data&&data.session){user=data.session.user;window.__pbReady()}
    else{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>loginScreen());else loginScreen()}})();
  sb.auth.onAuthStateChange((ev,session)=>{if(ev==='SIGNED_OUT'){location.reload()}});

  const err=(e,code)=>({code:code||(e&&e.code)||'error',message:(e&&e.message)||String(e)});

  // ---------- database (table "docs": collection, id, data) ----------
  const cache={},loaded={},listeners={};let emitT={};
  function snapOf(c){const m=cache[c]||new Map();return {docs:[...m.entries()].map(([id,d])=>({id,exists:true,data:()=>d}))}}
  function emit(c){clearTimeout(emitT[c]);emitT[c]=setTimeout(()=>{(listeners[c]||[]).forEach(f=>{try{f(snapOf(c))}catch(e){console.error(e)}})},20)}
  function load(c,force){if(!loaded[c]||force)loaded[c]=(async()=>{
      const all=[];let from=0;for(;;){const {data,error}=await sb.from('docs').select('id,data').eq('collection',c).range(from,from+999);if(error)throw err(error);all.push(...data);if(data.length<1000)break;from+=1000}
      cache[c]=new Map(all.map(r=>[r.id,r.data]));emit(c)})().catch(e=>{loaded[c]=null;throw e});
    return loaded[c]}
  let channel=null;
  function live(){if(channel)return;channel=sb.channel('pb-docs').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{
      if(p.eventType==='DELETE'){const o=p.old||{};if(o.collection&&cache[o.collection]){cache[o.collection].delete(o.id);emit(o.collection)}return}
      const n=p.new||{};if(n.collection&&cache[n.collection]){cache[n.collection].set(n.id,n.data);emit(n.collection)}}).subscribe()}
  // iPhone apps get paused in the background: refetch when you come back
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user){Object.keys(loaded).forEach(c=>load(c,true).catch(()=>{}));
    if(channel){sb.removeChannel(channel);channel=null;live()}}});
  function local(c,id,d){if(!cache[c])return;if(d===undefined)cache[c].delete(id);else cache[c].set(id,d);emit(c)}
  const db={
    collection(c){return {
      get:async()=>{await load(c,true);return snapOf(c)},
      onSnapshot(f,onErr){(listeners[c]=listeners[c]||[]).push(f);live();load(c).then(()=>f(snapOf(c))).catch(e=>onErr&&onErr(e));return ()=>{listeners[c]=(listeners[c]||[]).filter(x=>x!==f)}}}},
    doc(path){const i=path.indexOf('/');const c=path.slice(0,i),id=path.slice(i+1);return {
      async get(){if(cache[c]){const d=cache[c].get(id);return {id,exists:d!==undefined,data:()=>d}}
        const {data,error}=await sb.from('docs').select('data').eq('collection',c).eq('id',id).maybeSingle();if(error)throw err(error);return {id,exists:!!data,data:()=>data&&data.data}},
      async set(d){d=JSON.parse(JSON.stringify(d));local(c,id,d);const {error}=await sb.from('docs').upsert({collection:c,id,data:d},{onConflict:'collection,id'});if(error)throw err(error)},
      async update(patch){patch=JSON.parse(JSON.stringify(patch));if(cache[c])local(c,id,{...(cache[c].get(id)||{}),...patch});
        const {error}=await sb.rpc('doc_merge',{p_collection:c,p_id:id,p_patch:patch});if(error)throw err(error)},
      async delete(){local(c,id,undefined);const {error}=await sb.from('docs').delete().eq('collection',c).eq('id',id);if(error)throw err(error)},
      onSnapshot(f,onErr){const g=s=>{const d=(cache[c]||new Map()).get(id);f({id,exists:d!==undefined,data:()=>d})};(listeners[c]=listeners[c]||[]).push(g);live();
        load(c).then(()=>g()).catch(e=>onErr&&onErr(e));return ()=>{listeners[c]=(listeners[c]||[]).filter(x=>x!==g)}}}}
  };

  // ---------- photos (storage bucket "photos") ----------
  const assets={async upload(blob){const ext=/png/.test(blob.type)?'png':'jpg';const id=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.'+ext;
    const {error}=await sb.storage.from('photos').upload(id,blob,{contentType:blob.type||'image/jpeg',upsert:false});if(error)throw err(error);return {id}}};
  const realFetch=window.fetch.bind(window);
  window.fetch=async(u,o)=>{if(typeof u==='string'&&u.startsWith('/_blob/')){await ready;const {data,error}=await sb.storage.from('photos').download(u.slice(7));
      return error?new Response(null,{status:404}):new Response(data,{status:200,headers:{'content-type':data.type||'image/jpeg'}})}
    return realFetch(u,o)};

  // ---------- saving files: on iPhone this opens the share sheet (Save Image / Save Video) ----------
  const TYPES={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',mp4:'video/mp4',webm:'video/webm',txt:'text/plain',json:'application/json'};
  const touch=matchMedia('(pointer:coarse)').matches;
  function anchor(file){const u=URL.createObjectURL(file);const a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
  function sheet(file){return new Promise((res,rej)=>{const m=document.createElement('div');m.className='modal';const isV=file.type.startsWith('video');const u=URL.createObjectURL(file);
    m.innerHTML=`<div style="display:grid;gap:12px;justify-items:center">${isV?'<video controls playsinline muted style="max-height:62vh;max-width:100%"></video>':'<img alt="Your file" style="max-height:62vh;max-width:100%">'}
      <div class="row"><button type="button" class="pb-share">${isV?'Save video':'Save image'}</button><button type="button" class="ghost pb-close" style="color:#fff!important">Close</button></div><p>Tap Save, then choose “${isV?'Save Video':'Save Image'}”.</p></div>`;
    m.querySelector(isV?'video':'img').src=u;document.body.appendChild(m);
    const done=(ok)=>{m.remove();URL.revokeObjectURL(u);ok?res({saved:true}):rej({code:'declined',message:'closed'})};
    m.querySelector('.pb-share').onclick=async()=>{try{await navigator.share({files:[file]});done(true)}catch(e){if(e&&e.name==='AbortError')return;anchor(file);done(true)}};
    m.querySelector('.pb-close').onclick=()=>done(false)})}
  const downloads={async save({filename,data}){const ext=(String(filename).split('.').pop()||'').toLowerCase();const type=TYPES[ext]||'application/octet-stream';
    const blob=data instanceof Blob?data:new Blob([data],{type});const file=new File([blob],filename,{type});
    if(touch&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file]});return {saved:true}}
      catch(e){if(e&&e.name==='AbortError')throw {code:'declined',message:'cancelled'};return await sheet(file)}}
    anchor(file);return {saved:true}}};

  // ---------- Claude (through your Supabase function, so your API key stays secret) ----------
  const b64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob)});
  async function imgs(x){if(!x)return [];const a=Array.isArray(x)?x:[x];return Promise.all(a.map(async b=>({type:b.type||'image/jpeg',data:await b64(b)})))}
  async function call(body){await ready;const {data,error}=await sb.functions.invoke('claude',{body});
    if(error){let code='error',message=error.message;try{const j=await error.context.json();code=j.code||code;message=j.message||message}catch(e){}throw {code,message}}
    if(data&&data.code)throw {code:data.code,message:data.message};return data}
  function parseJSON(t){t=String(t||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');try{return JSON.parse(t)}catch(e){}
    const s=Math.min(...['{','['].map(ch=>{const i=t.indexOf(ch);return i<0?1e9:i}));const e2=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
    if(s<1e9&&e2>s){try{return JSON.parse(t.slice(s,e2+1))}catch(e){}}return undefined}
  const sample=async(prompt,opts)=>{opts=opts||{};try{const r=await call({prompt,images:await imgs(opts.images),max_tokens:opts.maxTokens||2500});if(opts.onText)opts.onText({text:r.text});return r.text}
    catch(e){e.text='';throw e}};
  sample.json=async(prompt,opts)=>{opts=opts||{};const r=await call({prompt,images:await imgs(opts.images),json:true,max_tokens:opts.maxTokens||4000});const j=parseJSON(r.text);if(j===undefined)throw {code:'invalid_json',message:'bad json'};return j};
  sample.limits=async()=>({images:true});

  // ---------- "Scan now" / "Research new posts now" ----------
  window.PB={scanNote:C.scanNote||'Scans run every 2 hours from 7am to 11pm.',
    async scan(kind){await ready;const {data,error}=await sb.functions.invoke('scan-now',{body:{kind}});
      if(error){let m='Couldn’t start the scan.';try{const j=await error.context.json();m=j.message||m}catch(e){}throw new Error(m)}return data},
    async signOut(){await sb.auth.signOut()}};

  // monthly Claude spend, shown at the top of Insights
  async function showSpend(){try{const {data}=await sb.from('docs').select('data').eq('collection','meta').eq('id','usage').maybeSingle();
    const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
    const usd=data&&data.data&&data.data.month===month?Number(data.data.usd||0):0;const gbp=usd*(C.usdToGbp||0.78),cap=C.budgetGbp||10;
    const v=document.getElementById('view-insights');if(!v)return;let el=document.getElementById('pb-spend');if(!el){el=document.createElement('p');el.id='pb-spend';el.className='note';v.prepend(el)}
    el.innerHTML='<b>Claude spend this month: £'+gbp.toFixed(2)+' of your £'+cap+' budget.</b> Automatic news checks pause at £'+(cap*0.85).toFixed(2)+' so the buttons keep working; everything resets on the 1st.'}catch(e){}}
  ready.then(()=>{showSpend();setInterval(showSpend,5*60000);document.addEventListener('click',e=>{if(e.target&&e.target.id==='tab-insights')showSpend()})});
  // ---------- Higgsfield (Kling video + AI backgrounds) ----------
  async function hf(body){await ready;const {data,error}=await sb.functions.invoke('higgsfield',{body});
    if(error){let m=error.message;try{const j=await error.context.json();m=j.message||m}catch(e){}throw new Error(m)}
    if(data&&data.code)throw new Error(data.message||data.code);return data}
  window.PB.higgsfield={
    async video({image,prompt,negative,duration,post}){return hf({action:'video',image:await b64(image),prompt,negative,duration,post})},
    async image({prompt,aspect,post}){return hf({action:'image',prompt,aspect,post})},
    async status(id){return hf({action:'status',id})},
    async wait(id,onTick){const t0=Date.now();for(;;){await new Promise(r=>setTimeout(r,6000));const s=await hf({action:'status',id});onTick&&onTick(s,Math.round((Date.now()-t0)/1000));
      if(s.status==='completed'||s.status==='blocked'||s.status==='failed'||s.status==='canceled')return s;if(Date.now()-t0>12*60000)return {status:'failed',message:'Still not finished after 12 minutes. Check again later.'}}}};

  // ---------- OpusClip (clips from your long videos, ranking, scheduling) ----------
  async function op(body){await ready;const {data,error}=await sb.functions.invoke('opus',{body});
    if(error){let m=error.message;try{const j=await error.context.json();m=j.message||m}catch(e){}throw new Error(m)}
    if(data&&data.code)throw new Error(data.message||data.code);return data}
  window.PB.opus={
    create:(o)=>op({action:'create',...o}),
    import:(link,title)=>op({action:'import',link,title}),
    check:(id,rerank)=>op({action:'check',id,rerank:!!rerank}),
    plan:()=>op({action:'plan'}),
    accounts:()=>op({action:'accounts'}),
    templates:()=>op({action:'templates'}),
    schedule:(clip,at,targets)=>op({action:'schedule',clip,at:at||null,targets}),
    cancel:(clip)=>op({action:'cancel',clip}),
    async file(clip){await ready;const {data,error}=await sb.functions.invoke('opus',{body:{action:'file',clip}});
      if(error){let m=error.message;try{const j=await error.context.json();m=j.message||m}catch(e){}throw new Error(m)}
      if(!(data instanceof Blob))throw new Error((data&&data.message)||'Couldn’t fetch the video.');return data}};

  // ---------- earnings (YouTube + Facebook) ----------
  async function earn(body){await ready;const {data,error}=await sb.functions.invoke('earnings',{body});
    if(error){let m=error.message;try{const j=await error.context.json();m=j.message||m}catch(e){}throw new Error(m)}
    if(data&&data.code)throw new Error(data.message||data.code);return data}
  window.PB.earnings={
    async connect(provider){const r=await earn({action:'start',provider,back:location.origin+location.pathname});location.href=r.url},
    sync:(days)=>earn({action:'sync',days}),
    page:(id)=>earn({action:'page',id}),
    disconnect:(provider)=>earn({action:'disconnect',provider})};

  // ---------- phone alerts (web push) ----------
  const u8=b=>{const p='='.repeat((4-b.length%4)%4);const s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...s].map(c=>c.charCodeAt(0)))};
  async function subId(sub){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint));return [...new Uint8Array(buf)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('')}
  window.PB.push={
    supported:()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window,
    standaloneNeeded:()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!(navigator.standalone||matchMedia('(display-mode: standalone)').matches),
    async state(){if(!this.supported())return 'unsupported';if(Notification.permission==='denied')return 'denied';const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();return s?'on':'off'},
    async subscribe(){await ready;const {data}=await sb.from('docs').select('data').eq('collection','meta').eq('id','vapid').maybeSingle();
      const key=data&&data.data&&data.data.publicKey;if(!key)throw new Error('Alerts aren’t set up yet: re-run “1. Set up” on GitHub.');
      const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Notifications were not allowed. You can allow them in your phone’s settings.');
      const reg=await navigator.serviceWorker.ready;let s=await reg.pushManager.getSubscription();if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(key)});
      const j=s.toJSON();await sb.from('docs').upsert({collection:'push',id:await subId(s),data:{sub:j,ua:navigator.userAgent.slice(0,120),at:new Date().toISOString()}},{onConflict:'collection,id'});return true},
    async test(delay){await ready;const {data,error}=await sb.functions.invoke('tick',{body:{action:'test',delay:delay||0}});if(error)throw new Error('Test failed');return data}};
  window.PB.config=C;
  const caps={db,assets,downloads,sample};
  window.claude={use:async name=>{await ready;return caps[name]||null}};
})();
