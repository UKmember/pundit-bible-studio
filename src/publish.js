
// ---------- hashtags + publishing pack ----------
// Platform rules (checked Sept 2026):
//  Instagram: max 5 hashtags per post/reel (Instagram's own limit since Dec 2025).
//  Facebook: 3 recommended (broad + niche + content), never more than 5.
//  TikTok: no hard limit, 3-5 focused tags perform best.
//  YouTube: 1-3 in title/description show above the title; more than 60 and YouTube ignores them all; keep it to a handful.
const HT_RULES={
  facebook:{n:3,max:5,label:'Facebook',note:'3 is the sweet spot (one broad, one niche, one about the post). Never more than 5.'},
  instagram:{n:5,max:5,label:'Instagram',note:'Instagram allows 5 hashtags at most. More than 5 and the post can fail.'},
  tiktok:{n:5,max:5,label:'TikTok',note:'3 to 5 focused tags work best. Stuffing more in doesn’t help.'},
  youtube:{n:4,max:5,label:'YouTube Shorts',note:'The first 3 hashtags show above your title. Keep it to a handful: over 60 and YouTube ignores them all.'}
};
const CLUB_TAGS=[
  [/\bman(chester)? ?(utd|united)\b|\bmufc\b|old trafford|red devils/i,'#ManUtd','Manchester United'],
  [/\bman(chester)? ?city\b|\bmcfc\b|\bcityzens\b|etihad/i,'#ManCity','Manchester City'],
  [/\bliverpool\b|\blfc\b|anfield/i,'#LFC','Liverpool'],
  [/\barsenal\b|\bgunners\b|emirates stadium/i,'#Arsenal','Arsenal'],
  [/\bchelsea\b|stamford bridge/i,'#Chelsea','Chelsea'],
  [/\btottenham\b|\bspurs\b|\bthfc\b/i,'#Spurs','Tottenham'],
  [/\bnewcastle\b|\bnufc\b|st james/i,'#NUFC','Newcastle'],
  [/\baston villa\b|\bvilla\b|\bavfc\b/i,'#AVFC','Aston Villa'],
  [/\bwest ham\b|\bwhufc\b|\bhammers\b/i,'#WHUFC','West Ham'],
  [/\beverton\b|\btoffees\b/i,'#EFC','Everton'],
  [/\bbrighton\b/i,'#BHAFC','Brighton'],
  [/\bnott(ingham|s)? ?forest\b|\bnffc\b/i,'#NFFC','Nottingham Forest'],
  [/\bnotts county\b/i,'#NottsCounty','Notts County'],
  [/\bleeds\b|\blufc\b/i,'#LUFC','Leeds United'],
  [/\bsunderland\b|\bsafc\b/i,'#SAFC','Sunderland'],
  [/\bwolves\b|\bwolverhampton\b/i,'#Wolves','Wolves'],
  [/\bcrystal palace\b|\bpalace\b|\bcpfc\b/i,'#CPFC','Crystal Palace'],
  [/\bfulham\b/i,'#Fulham','Fulham'],
  [/\bbrentford\b/i,'#Brentford','Brentford'],
  [/\bbournemouth\b|\bafcb\b/i,'#AFCB','Bournemouth'],
  [/\bburnley\b/i,'#Burnley','Burnley'],
  [/\breal madrid\b/i,'#RealMadrid','Real Madrid'],
  [/\bbarcelona\b|\bbarca\b|\bbarça\b/i,'#FCBarcelona','Barcelona'],
  [/\bbayern\b/i,'#FCBayern','Bayern Munich'],
  [/\bpsg\b|paris saint/i,'#PSG','PSG'],
  [/\bjuventus\b|\bjuve\b/i,'#Juventus','Juventus'],
  [/\binter miami\b/i,'#InterMiami','Inter Miami'],
  [/\bal[- ]nassr\b/i,'#AlNassr','Al Nassr'],
  [/\bceltic\b/i,'#Celtic','Celtic'],
  [/\brangers\b/i,'#Rangers','Rangers'],
  [/\bengland\b|three ?lions/i,'#England','England'],
  [/\bscotland\b/i,'#Scotland','Scotland'],
  [/\bwales\b/i,'#Wales','Wales']
];
const COMP_TAGS=[
  [/champions league|\bucl\b/i,'#ChampionsLeague','Champions League'],
  [/europa league/i,'#EuropaLeague','Europa League'],
  [/conference league/i,'#ConferenceLeague','Conference League'],
  [/carabao|league cup|efl cup/i,'#CarabaoCup','Carabao Cup'],
  [/\bfa cup\b/i,'#FACup','FA Cup'],
  [/nations league/i,'#NationsLeague','Nations League'],
  [/world cup/i,'#WorldCup','World Cup'],
  [/championship|\befl\b|league one|league two/i,'#EFL','EFL'],
  [/la liga/i,'#LaLiga','La Liga'],[/serie a/i,'#SerieA','Serie A'],[/bundesliga/i,'#Bundesliga','Bundesliga'],
  [/premier league|\bepl\b|\bprem\b/i,'#PremierLeague','Premier League']
];
const PL_CLUBS=/#(ManUtd|ManCity|LFC|Arsenal|Chelsea|Spurs|NUFC|AVFC|WHUFC|EFC|BHAFC|NFFC|LUFC|SAFC|Wolves|CPFC|Fulham|Brentford|AFCB|Burnley)$/;
const TYPE_TAGS={guess:'#GuessThePlayer',h2h:'#FootballDebate',split:'#FootballDebate',poll:'#FootballDebate',ratings:'#PlayerRatings',result:'#MatchDay',goal:'#Goal',versus:'#MatchDay',ranking:'#FootballDebate',carousel:'#FootballDebate',quote:'#FootballNews',headline:'#FootballNews',stat:'#FootballNews',list:'#FootballNews'};
function camelTag(name){const w=String(name||'').replace(/[^A-Za-zÀ-ÿ' -]/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/'/g,'').split(/[\s-]+/).filter(Boolean);
  if(!w.length||w.join('').length<3)return '';return '#'+w.slice(-3).map(s=>s[0].toUpperCase()+s.slice(1)).join('')}
function isBoxing(p){return /boxing|heavyweight|\bfury\b|\bjoshua\b|\busyk\b|undisputed|\bfight night\b/i.test([p.title,p.caption,p.sport,(p.fields||{}).tag].join(' '))&&!/premier league|\bgoal\b|\bfc\b/i.test(p.title||'')}
function peopleOf(p){const f=p.fields||{};const out=[];
  ['speaker','scorer','answer','aName','bName'].forEach(k=>{if(f[k])out.push(String(f[k]))});
  if(!out.length&&p.photoSearch&&p.photoSearch.term){const t=p.photoSearch.term.split(/\s+/).slice(0,2).join(' ');if(/^[A-Z][a-z]+ [A-Z]/.test(t))out.push(t)}
  return out.filter(n=>!CLUB_TAGS.some(([re])=>re.test(n)))}
// Candidate tags for a post, grouped.
function tagPool(p){
  const f=p.fields||{};const txt=[p.title,p.caption,f.tag,f.home,f.away,f.aSub,f.bSub,f.context,f.subtitle,(p.photoSearch||{}).term].filter(Boolean).join(' \n ');
  const clubs=[],comps=[];CLUB_TAGS.forEach(([re,t])=>{if(re.test(txt)&&!clubs.includes(t))clubs.push(t)});COMP_TAGS.forEach(([re,t])=>{if(re.test(txt)&&!comps.includes(t))comps.push(t)});
  if(comps.includes('#ChampionsLeague')||comps.includes('#EuropaLeague'))comps.splice(comps.indexOf('#PremierLeague')>=0?comps.indexOf('#PremierLeague'):99,1);
  const people=peopleOf(p).map(camelTag).filter(Boolean);
  const own=(String(p.caption||'').match(/#[A-Za-z0-9_]+/g)||[]).filter(t=>!/^#punditbible$/i.test(t));
  const boxing=isBoxing(p);
  const broad=boxing?['#Boxing','#BoxingNews']:['#Football','#FootballNews'];
  const league=boxing?[]:(comps.length?comps:(clubs.some(c=>PL_CLUBS.test(c))?['#PremierLeague']:[]));
  const type=boxing?(['split','h2h','poll'].includes(p.template)?'#WhoWins':'#Boxing'):(TYPE_TAGS[p.template]||'#FootballNews');
  return {broad,league,clubs,people,own,type,boxing}}
function dedupe(a){const s=new Set();return a.filter(t=>{if(!t)return false;const k=t.toLowerCase();if(s.has(k))return false;s.add(k);return true})}
function tagsFor(p,plat){const P=tagPool(p);const niche=dedupe([...P.people,P.clubs[0],...P.own.filter(t=>!/^#(football|soccer|fyp|foryou|premierleague|punditbible|footballnews)$/i.test(t)&&!CLUB_TAGS.some(([re,ct])=>P.clubs.includes(ct)&&re.test(t.slice(1)))&&!COMP_TAGS.some(([re])=>re.test(t.slice(1)))),...P.clubs.slice(1)]);
  let out;
  if(plat==='facebook')out=[niche[0]||P.league[0]||P.broad[1],P.league[0]&&niche[0]?P.league[0]:P.broad[0],P.type];
  else if(plat==='instagram')out=[P.broad[0],P.league[0],niche[0],niche[1],P.type,P.broad[1]];
  else if(plat==='tiktok')out=[P.broad[0],P.boxing?'#BoxingTikTok':'#FootballTikTok',niche[0],niche[1]||P.league[0],P.type,'#PunditBible'];
  else out=[P.broad[0],niche[0],P.league[0]||P.type,'#Shorts',niche[1]];
  out=dedupe(out);
  // top up to the target with sensible fallbacks
  const fill=[P.league[0],niche[2],P.type,P.broad[1],'#PunditBible'];for(const t of fill){if(out.length>=HT_RULES[plat].n)break;if(t&&!out.some(x=>x.toLowerCase()===t.toLowerCase()))out.push(t)}
  return out.slice(0,HT_RULES[plat].n)}
function stripTags(s){return String(s||'').split('\n').map(l=>l.replace(/(^|\s)#[A-Za-z0-9_]+/g,'').replace(/\s+$/,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
function countTags(s){return (String(s||'').match(/(^|\s)#[A-Za-z0-9_]+/g)||[]).length}
function clipTags(s,max){let n=0;return String(s||'').replace(/(^|\s)(#[A-Za-z0-9_]+)/g,(m,a,t)=>(++n>max?'':m)).replace(/[ \t]+$/gm,'')}
function captionBody(p){return stripTags(p.caption||'')||p.title||''}
function hookOf(p){return (captionBody(p).split(/\n\n/)[0]||p.title||'').trim()}
function questionOf(p){return ((p.fields&&p.fields.question)||'').trim()}
function packDefaults(p){
  const body=captionBody(p),q=questionOf(p),hook=hookOf(p);
  const lastPara=(body.split(/\n\n/).pop()||'');const hasQ=!q||body.toLowerCase().includes(q.toLowerCase().slice(0,18))||/\?\s*(👇|👀|🤔)?\s*$/.test(lastPara)||/👇/.test(lastPara);
  const main=body+(!hasQ?'\n\n'+q+' 👇':'');
  const fb=main+'\n\n'+tagsFor(p,'facebook').join(' ');
  const ig=main+'\n\n'+tagsFor(p,'instagram').join(' ');
  let tth=hook;if(tth.length>150){const m=tth.match(/^.{20,150}?[.!?](\s|$)/);tth=m?m[0].trim():tth.slice(0,147).replace(/\s+\S*$/,'')+'…'}
  const tq=q||(/\?/.test(lastPara)?lastPara.replace(/\s*👇\s*$/,''):'');
  const tt=tth+'\n\n'+(tq?tq+' 👇\n\n':'')+tagsFor(p,'tiktok').join(' ');
  const yt=tagsFor(p,'youtube');const titleTags=yt[1]||yt[0];
  const noEmo=x=>String(x||'').replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu,'').replace(/\s+/g,' ').trim();
  let tbase=noEmo(p.title&&p.title.length>=12&&p.title.length<=85?p.title:hook);
  const room=100-titleTags.length-1;if(tbase.length>room)tbase=tbase.slice(0,room-1).replace(/\s+\S*$/,'')+'…';
  const P=tagPool(p);const kw=dedupe([...peopleOf(p),...CLUB_TAGS.filter(([,t])=>P.clubs.includes(t)).map(x=>x[2]),...COMP_TAGS.filter(([,t])=>P.league.includes(t)).map(x=>x[2]),P.boxing?'boxing':'football',P.boxing?'boxing news':'football news','Pundit Bible']);
  return {facebook:fb,instagram:ig,tiktok:tt,youtube:{title:(tbase+' '+titleTags).trim(),description:main+'\n\nFollow Pundit Bible for daily football takes.\n\n'+yt.filter(t=>t!==titleTags).slice(0,3).join(' '),tags:kw.join(', ')}}}
function packOf(p){const d=packDefaults(p);const s=p.pack||{};return {facebook:s.facebook||d.facebook,instagram:s.instagram||d.instagram,tiktok:p.ttCaption||d.tiktok,youtube:{...d.youtube,...(s.youtube||{})}}}
// kept for the TikTok step
function ttCaptionFor(p){return packDefaults(p).tiktok}
function tagNote(plat,txt){const n=countTags(txt),r=HT_RULES[plat];const over=n>r.max;return {over,text:n+' hashtag'+(n===1?'':'s')+(over?' — too many! '+r.label+' max is '+r.max+'.':' · '+r.note)}}
