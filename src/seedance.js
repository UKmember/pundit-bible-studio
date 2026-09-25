// ---------- Seedance 2.5 image-to-video prompt ----------
const SEED={
  quote:{mood:'defiant, dramatic, a mic-drop moment',dir:'They have just said the line on the card and they mean every word.',motive:'A figure whose word still carries weight; nobody tells them what to think.',goal:'Make the viewer feel the full weight of the quote.',tactic:'Hold the lens like a verdict: a slow, certain stare, checking the viewer after every beat (did that land?).',hook:'eyes snap straight to the lens as the camera snaps in; a tiny lift of the chin',build:'a slow breath in, the jaw sets, the corner of the mouth curls into a knowing half-smile',cpName:'THE VERDICT',cp:'one slow, deliberate head shake "no" while holding eye contact; any visible pointing hand pushes a few centimetres toward the lens and stops dead',q:'dead still, one eyebrow lifts a millimetre, eyes fixed on the viewer: well, are you going to argue?',bg:'press-photographer flashes pop softly in the blurred background, a warm floodlight glow breathes behind them',sfx:['0.0s — a deep sub-bass BOOM with a sharp camera-flash "fzzt" on the snap','0.0–8.0s — low stadium crowd murmur bed, ducked under every hit','1.0–2.0s — a rapid burst of press camera shutters, left then right','2.0s — a clean whoosh as the light sweeps across the headline','3.2s — a heavy low "thud" landing exactly on the head shake','4.5s — the crowd swells into a long "ooooooh"','5.0s — a soft glassy shimmer as the question bar glows','7.6s — a short reversed-cymbal riser that loops back into the opening boom']},
  headline:{mood:'crisis, pressure, the walls closing in',dir:'They are living through the moment on the card and everyone is watching.',motive:'Pride under pressure: they know the numbers are against them.',goal:'Hold it together in front of the cameras.',tactic:'Clench, exhale, look away, then force their eyes back to the lens as if the viewer just asked the question out loud.',hook:'a sharp flinch as the camera flash hits; eyes lift to the lens',build:'the jaw clenches, a heavy exhale through the nose, eyes drop to the ground then climb slowly back up',cpName:'THE WEIGHT',cp:'a slow shake of the head, lips pressed tight, a tiny wince at the corner of the eyes',q:'they look straight down the lens, cornered and defiant at once, waiting for the viewer’s answer',bg:'floodlights flicker coldly, a thin haze drifts across the stands, the crowd behind is a dark soft blur',sfx:['0.0s — a heavy sub-bass hit with a camera-flash snap','0.0–8.0s — a slow heartbeat thump (about 70 bpm) under everything','1.5s — distant crowd boos rise and hang','2.0s — a cold whoosh with the light sweep','3.2s — a deep dull impact on the head shake','5.0s — a tense high string-like drone (sound design, not music) swells into the question beat','7.6s — the heartbeat fades back to the opening thump for the loop']},
  stat:{mood:'shock and disbelief',dir:'The number on the card has just landed and it does not add up.',motive:'They are the face of the story and they know how it looks.',goal:'Take in a number that should not be possible.',tactic:'A slow double-take at the viewer, as if to say: you seeing this too?',hook:'eyes snap to the lens on the snap-in',build:'a slow blink, a half-laugh of disbelief through the nose, the head tilts a few degrees',cpName:'THE DOUBLE-TAKE',cp:'eyes flick away to one side, then snap back to the lens with raised eyebrows',q:'a small shrug and a steady stare into the lens: explain that one',bg:'stadium lights glow and a slow haze drifts through the background',sfx:['0.0s — a deep bass hit and flash snap','0.5–1.5s — a rapid mechanical counter ticking up fast','1.5s — a bright cash-register "ka-ching"','2.0s — a whoosh with the light sweep','3.2s — a crowd gasp on the double-take','5.0s — a low tension drone swells under the question','7.6s — a tick-tick that loops into the opening hit']},
  list:{mood:'breaking news urgency',dir:'The news on the card has just broken.',motive:'They know this changes everything for the team.',goal:'Absorb the news without giving anything away.',tactic:'Grave focus: a slow read of the room, then a steady look to the viewer.',hook:'the head turns sharply to the lens on the snap',build:'a slow exhale, the jaw tightens, eyes narrow slightly',cpName:'THE NEWS LANDS',cp:'one short, grave nod, lips pressed together',q:'eyebrows lift slightly, eyes on the viewer: your call',bg:'training-ground or stadium lights glow softly, haze drifts',sfx:['0.0s — a sharp news-alert sting (sound design) with a bass hit','0.6–2.0s — quick ticking clicks','2.0s — a whoosh with the light sweep','3.2s — a low thud on the nod','4.5s — a crowd murmur rises','7.6s — the alert sting rewinds into the loop']},
  versus:{mood:'big-match anticipation, goosebumps',dir:'Minutes before kick-off in a huge game.',motive:'This is the fixture everyone circles in the calendar.',goal:'Stay locked in while the noise builds.',tactic:'Stillness against chaos: calm eyes, rising intensity.',hook:'eyes lift to the lens on the snap',build:'shoulders square, breath slows, focus sharpens',cpName:'THE STARE-DOWN',cp:'the chin lifts, eyes lock on the lens, a fist tightens at the edge of frame if hands are visible',q:'a slight nod at the viewer: go on then, call the score',bg:'a packed stadium: flags wave in the soft blur, floodlights shimmer, confetti-like light specks drift',sfx:['0.0s — a huge bass hit and flash','0.0–8.0s — a stadium crowd chanting with no clear words, building','1.0s — big drums kick in: boom, boom, boom-boom','2.0s — a whoosh with the light sweep','3.5s — a tension riser','4.5s — a referee whistle, then the crowd roars','7.6s — the drums loop back to the first boom']},
  poll:{mood:'suspense, the axe hanging',dir:'Everyone is voting on their fate.',motive:'They can feel the vote going against them.',goal:'Not flinch.',tactic:'Eyes darting across the options, then holding the viewer’s gaze.',hook:'eyes snap to the lens',build:'a nervous swallow, eyes flick left then right',cpName:'THE GLANCE',cp:'a slow look across the options on screen, then a sharp look back to the lens',q:'held breath, a tiny nod at the viewer: pick one',bg:'floodlights pulse gently, haze drifts',sfx:['0.0s — a deep bass hit and flash','0.5–3.0s — a rolling drum roll','2.0s — a whoosh with the light sweep','3.0s, 3.4s, 3.8s, 4.2s — four quick heavy hits, one per option','5.0s — the drum roll cuts to silence for the question','7.6s — a riser into the loop']},
  ranking:{mood:'league-table drama',dir:'The table has just updated.',motive:'Their side is in a place nobody expected.',goal:'Enjoy it or endure it, visibly.',tactic:'A knowing look at the viewer.',hook:'eyes to the lens on the snap',build:'a slow smile or a slow grimace builds',cpName:'THE REACTION',cp:'a proud little nod or a disbelieving shake of the head',q:'eyes on the viewer: believe it?',bg:'crowd bokeh shimmers, floodlights glow',sfx:['0.0s — a bass hit and flash','1.0s — a quick whoosh','2.0s — a whoosh with the light sweep','3.2s — applause builds','4.5s — a stadium cheer','7.6s — the whoosh loops back']},
  result:{mood:'full-time euphoria',dir:'The final whistle has just gone.',motive:'This result means everything.',goal:'Let it all out.',tactic:'Explosive release, then pride.',hook:'eyes snap to the lens on the snap, a sharp breath',build:'the chest rises, fists tighten, a grin breaks',cpName:'THE ROAR',cp:'a silent open-mouthed roar of celebration, fists pumping once (no voice; the crowd carries the sound)',q:'breathing hard, a big proud grin at the viewer',bg:'the crowd erupts in the blur, flags wave, light specks float in the floodlights',sfx:['0.0s — a bass hit and flash','0.5s — a referee’s final whistle: three sharp blasts','1.0s — the crowd erupts into a huge roar','2.0s — a whoosh with the light sweep','3.2s — a massive second crowd surge on the roar','5.0s — flags flapping and applause','7.6s — the roar dips and loops']},
  split:{mood:'head-to-head showdown',dir:'Two rivals, one vote.',motive:'Each thinks they are the best.',goal:'Win the stare-down.',tactic:'Competitive confidence, eyes flicking to the rival.',hook:'both sets of eyes snap to the lens',build:'both chins lift, confident half-smiles',cpName:'THE FACE-OFF',cp:'both heads turn a few degrees toward each other across the divide, then snap back to the lens; the VS badge glows but its letters stay locked',q:'both hold the lens, eyebrows up: A or B?',bg:'each side glows in its own team colour, floodlights flicker',sfx:['0.0s — a boxing-bell DING with a bass hit','0.0–8.0s — crowd noise split hard left and right','2.0s — a whoosh with the light sweep','3.2s — a heavy impact as the heads turn','4.0s — tense drums','7.6s — the bell rings again softly into the loop']},
  ratings:{mood:'post-match verdict',dir:'The marks are in.',motive:'They know fans will argue.',goal:'Stand by the verdict.',tactic:'Calm confidence.',hook:'eyes to the lens on the snap',build:'a slow approving nod',cpName:'THE VERDICT',cp:'a small shrug and a nod',q:'eyes on the viewer: who did we get wrong?',bg:'the stadium empties under glowing floodlights, light haze',sfx:['0.0s — a bass hit and flash','0.5s — a stadium PA hum','1.0s and 2.4s — a pen scribble','2.0s — a whoosh with the light sweep','3.2s — scattered applause','7.6s — the PA hum loops']},
  goal:{mood:'pure goal euphoria',dir:'The ball has just hit the net.',motive:'This goal changes the game.',goal:'Celebrate like it matters, because it does.',tactic:'Explosive release aimed straight at the viewer.',hook:'the celebration explodes on the snap: arms out, mouth open in a silent roar',build:'running energy, fists clenched, chest out',cpName:'THE CELEBRATION',cp:'a big two-fisted celebration toward the lens (no voice; the crowd carries the sound)',q:'breathing hard, a huge grin at the viewer',bg:'the crowd erupts in the blur, flags wave, floodlight flares',sfx:['0.0s \u2014 a net-ripple swish and a massive crowd roar erupting','0.0\u20138.0s \u2014 the roar rolls on under everything','1.0s \u2014 a deep bass hit','2.0s \u2014 a whoosh with the light sweep','3.2s \u2014 a second crowd surge on the celebration','7.6s \u2014 the roar dips and loops']},
  guess:{mood:'mystery and intrigue',dir:'Nobody knows who this is yet.',motive:'Keep the secret.',goal:'Tease the viewer into guessing.',tactic:'Give nothing away.',hook:'the obscured photo shimmers as the camera snaps in',build:'the pixelated or silhouetted figure stays obscured; only light and haze move around it',cpName:'THE TEASE',cp:'a slow pulse of light behind the hidden figure, the big question mark glows (its shape stays locked)',q:'everything holds still as if waiting for the viewer\u2019s guess',bg:'haze drifts, floodlights glow behind the mystery figure',sfx:['0.0s \u2014 a deep mysterious bass hit','0.5\u20133.0s \u2014 a ticking clock','2.0s \u2014 a whoosh with the light sweep','3.5s \u2014 a tension riser','5.0s \u2014 a quiz-show style "ding"','7.6s \u2014 the tick loops']},
  h2h:{mood:'head-to-head showdown',dir:'Two rivals, the numbers on the table.',motive:'Each thinks the stats prove they are the best.',goal:'Win the argument.',tactic:'Confident stares across the divide.',hook:'both sets of eyes snap to the lens',build:'both chins lift, confident half-smiles',cpName:'THE FACE-OFF',cp:'both heads turn a few degrees toward each other, then back to the lens; the VS badge glows but stays locked',q:'both hold the lens, eyebrows up: who wins it?',bg:'each half glows in its own team colour',sfx:['0.0s \u2014 a boxing-bell DING with a bass hit','0.0\u20138.0s \u2014 crowd noise split left and right','1.5s \u2014 quick data "blip" sounds as the stat bars glint','3.2s \u2014 a heavy impact on the face-off','7.6s \u2014 the bell rings softly into the loop']},
  carousel:{mood:'countdown drama',dir:'The countdown starts here.',motive:'They are part of the list.',goal:'Hook the viewer into swiping.',tactic:'A serious look straight down the lens.',hook:'eyes to the lens on the snap',build:'stillness, a slow breath',cpName:'THE TEASE',cp:'the smallest smirk',q:'eyes on the viewer: swipe',bg:'floodlights glow and haze drifts',sfx:['0.0s — a whoosh and bass hit','1.5s — a ticking clock','2.0s — a whoosh with the light sweep','4.0s — a crowd "ooooh"','7.6s — the tick loops']}
};

const SEED_FX={
  goal:'at 0.5s the minute badge and the score bar catch a bright flash (their text stays locked)',
  guess:'the big question mark pulses with light twice; the hidden photo stays hidden',
  h2h:'a light glint runs along each stat bar from the centre outward between 1.0s and 2.0s',
  stat:'at 1.0s a ripple of light pulses outward from the big number (the digits stay locked and already show the final figure)',
  result:'at 0.8s the stadium scoreboard lights strobe three times behind the score (the digits stay locked)',
  versus:'the two team boxes glow alternately (left, right, left) in time with the drums; their text stays locked',
  poll:'options A, B, C and D each catch a quick light flash in turn at 3.0s, 3.4s, 3.8s and 4.2s',
  split:'the VS badge flashes brighter on the bell and again on the face-off',
  ratings:'a light glint runs down the ratings from top to bottom at 2.5s',
  ranking:'rows 1 to 4 catch a quick light glint one after another between 1.0s and 2.0s',
  list:'each name catches a quick light glint from top to bottom between 0.6s and 2.0s'
};
const SEED_TAKES=[
  {name:'Take A · The Snap',cam:'starts with a sharp 4% push-in in the first 0.5s (THE SNAP), then a slow, weighted drift inward; one soft handheld-style breath on the centrepiece beat; eases gently back in the last second to the opening framing. No shake, no spins, no cuts.',hook:null,open:null},
  {name:'Take B · The Slow Burn',cam:'holds perfectly still for the first 0.4s, then a slow creeping dolly-in for the rest of the clip (about 8%), ending on a tighter frame of the face; in the final 0.6s it glides back to the exact opening framing. No shake, no spins, no cuts.',hook:'total stillness, then the stillness breaks: one hard blink and the eyes lift to the lens on a single deep bass hit',open:'0.0s — 0.3s of near-silence, then one huge single heartbeat THUD'},
  {name:'Take C · The Arc',cam:'a slow 8-degree arc around the subject from left to right with gentle parallax (the background slides behind them; the graphic overlay never moves), a soft lens flare glides across on the opening hit, then the camera arcs smoothly back to the start position in the last second. No shake, no cuts.',hook:'a warm lens flare sweeps across the frame and the eyes cut to the lens as it passes',open:'0.0s — a whooshing flare sweep that lands on a deep sub-bass hit'}
];
const SEED_P2={
  goal:{name:'THE AFTERMATH',dir:'The celebration settles.',b:['still roaring, fists pumping','turns to point at the crowd','turns back to the lens, chest heaving, a proud grin','holds, arms out'],sfx:['8.0s \u2014 the crowd roar continues','10.0s \u2014 rhythmic clapping','12.5s \u2014 a chant with no clear words','14.5s \u2014 a second roar','15.8s \u2014 a bass hit']},
  guess:{name:'THE COUNTDOWN',dir:'Time is running out to guess.',b:['the question mark pulses faster','the haze thickens around the hidden figure','a spotlight sweeps across the obscured photo without revealing it','everything holds on the question mark'],sfx:['8.0s \u2014 ticking speeds up','11.0s \u2014 a rising tension riser','13.0s \u2014 a heartbeat thump','15.0s \u2014 the ticking stops','15.8s \u2014 a quiz-show ding']},
  h2h:{name:'ROUND TWO',dir:'The debate continues.',b:['the left player gives a confident nod','the right player answers with a raised eyebrow','both look across at each other','both turn back to the lens and hold'],sfx:['8.0s \u2014 split crowd noise continues','10.0s \u2014 a heavy hit on the left','11.5s \u2014 a heavy hit on the right','13.5s \u2014 tense drums','15.5s \u2014 the bell rings']},
  quote:{name:'THE WALK-AWAY',dir:'The point has been made; now let it sink in.',b:['holds the stare; any pointing hand slowly lowers to their side','a slow, satisfied exhale; the half-smile widens a touch','the head turns slightly away as if the matter is closed, then the eyes flick back to the lens one last time','settles into a still, knowing look that holds to the end'],sfx:['8.0–16.0s — the crowd murmur bed continues seamlessly','10.0s — a single camera shutter','12.5s — a low bass swell','14.5s — the crowd breaks into applause and whistles','15.8s — a final deep bass hit']},
  headline:{name:'THE BREAKING POINT',dir:'The pressure finally shows.',b:['eyes drop to the ground; a long exhale','the eyes close for a long beat','the eyes reopen and climb back to the lens with renewed defiance','a small, tight nod: not finished yet'],sfx:['8.0–16.0s — the heartbeat thump continues','9.5s — distant boos swell','12.0s — sudden near-silence','13.0s — a deep bass hit on the eyes opening','15.5s — a low riser to the end']},
  stat:{name:'THE REALISATION',dir:'The number is sinking in.',b:['a slow shake of the head','a silent, disbelieving laugh through the nose (no voice)','the eyes lift to the big number above, then back to the lens','a raised-eyebrow stare that holds'],sfx:['8.0s — a low tension drone continues','9.5s — a counter ticking faster and faster','12.0s — a cash-register "ka-ching"','14.0s — a crowd gasp','15.8s — a deep bass hit']},
  list:{name:'THE NEXT MOVE',dir:'Thinking about what happens next.',b:['a slow look off to one side, thinking','the jaw sets','the eyes return to the lens, decided','a single firm nod'],sfx:['8.0s — low murmur continues','10.0s — ticking clicks','12.5s — a whoosh','14.5s — a low thud on the nod','15.8s — a news-alert sting']},
  versus:{name:'THE WALK-OUT',dir:'The teams are about to walk out.',b:['the head turns toward the pitch as the crowd noise rises','a deep breath, shoulders square','the head turns back to the lens','a determined nod and a still stare to the end'],sfx:['8.0s — the chanting grows louder','10.0s — tunnel footsteps echo','12.0s — big drums return','14.0s — a huge crowd roar','15.8s — a referee whistle']},
  poll:{name:'THE WAIT',dir:'Waiting for the verdict.',b:['the eyes close; a deep breath','a long held pause','the eyes open straight into the lens','a small, brave shrug that holds'],sfx:['8.0s — the drum roll returns','11.0s — the drum roll stops dead','12.5s — a deep bass hit on the eyes opening','14.5s — a crowd "ooooh"','15.8s — a final hit']},
  ranking:{name:'THE CLIMB',dir:'Believing it.',b:['a slow smile builds','a look up at the table above','back to the lens with a proud nod','holds, chin up'],sfx:['8.0s — applause continues','10.5s — a whoosh','12.5s — a stadium cheer','15.0s — a triumphant bass hit','15.8s — applause fades']},
  result:{name:'THE AFTERMATH',dir:'The celebrations settle into pride.',b:['breathing hard, still smiling','the hands come together in slow applause toward the crowd (five fingers each, correct anatomy)','turns back to the lens with a proud nod','holds a satisfied look'],sfx:['8.0s — the crowd roar continues','10.0s — rhythmic clapping','12.5s — flags flapping','14.5s — a second crowd surge','15.8s — a deep bass hit']},
  split:{name:'ROUND TWO',dir:'The rivalry continues.',b:['the left person gives a slow confident nod','the right person answers with a raised eyebrow','both look at each other across the divide','both turn back to the lens and hold'],sfx:['8.0s — split crowd noise continues','10.0s — a heavy hit on the left','11.5s — a heavy hit on the right','13.5s — tense drums','15.5s — the bell rings']},
  ratings:{name:'THE ARGUMENT',dir:'Standing by the marks.',b:['a slow shrug','a small smile','a look off to one side, then back','a firm nod that holds'],sfx:['8.0s — PA hum continues','10.0s — a pen scribble','12.5s — scattered applause','14.5s — a whoosh','15.8s — a soft bass hit']},
  carousel:{name:'THE TEASE',dir:'Making them swipe.',b:['the smirk grows','a slow look toward the right edge of the frame, as if pointing to the next slide','back to the lens','holds'],sfx:['8.0s — ticking continues','10.5s — a whoosh to the right','13.0s — a bass hit','15.0s — a crowd "ooooh"','15.8s — a final whoosh']}
};
const SEED_NEG='warped text, redrawn letters, spelling changes, new words, captions, subtitles, watermark, text moving or wobbling, numbers changing, logo moving or spinning or morphing, coloured panels changing shape, layout shifting, graphics sliding, face morphing, identity change, different person, age change, clothes or hat changing, extra people, visible faces in the crowd, distorted face, asymmetric eyes, dead stare, frozen face, extra fingers, deformed hands, extra limbs, melting, smearing, blur, low resolution, plastic skin, AI-smooth skin, over-sharpening, flicker, jitter, camera shake, spinning camera, scene cuts, time-lapse lighting, cartoon, anime, CGI, 3D render, speech, talking, lip movement forming words, singing, voices, commentary, music';
function seedanceFor(p,take){
  take=take||0;const TK=SEED_TAKES[take%SEED_TAKES.length];const k0=SEED[p.template]||SEED.headline;
  const k={...k0,hook:TK.hook||k0.hook,sfx:TK.open?[TK.open].concat(k0.sfx.slice(1)):k0.sfx};const fx=SEED_FX[p.template];const f=p.fields||{};
  const split=p.template==='split';
  const known=split||!!((p.photo&&p.photo.who)||(p.photoSearch&&p.photoSearch.term));
  const who=split?`the two people in the photo (${f.aName||'A'} on the left, ${f.bName||'B'} on the right)`:((p.photo&&p.photo.who)||((p.photoSearch&&p.photoSearch.term)||'the person in the photo'));
  const whoShort=split?`${U(f.aName||'A')} & ${U(f.bName||'B')}`:(known?U(String(who).split(/[,(]| in | on | at /)[0]).slice(0,40):'THE SUBJECT');
  const P=t=>String(t).replace(/[.?!]+$/,'');const Q=t=>{t=String(t);return /[.?!]$/.test(t)?t:t+'.'};
  const headline=(f.quote&&f.quote.join(' '))||(f.lines&&f.lines.map(l=>l.t).join(' '))||f.big||f.title||[f.title1,f.title2].filter(Boolean).join(' ')||p.title||'';
  const place=LEFT[p.template]?'on the right-hand side of the frame, behind the headline column':'in the photo area at the top of the frame, above the panels';
  const prompt=`SEEDANCE 2.5 · IMAGE TO VIDEO · 9:16 vertical · 8 seconds · native audio ON · no music · no speech · ${TK.name}

TOP PRIORITY (read first):
1. @image1 is the FIRST FRAME. Every word and number, the round Pundit Bible logo, the red label, the white question bar and every coloured panel are a LOCKED GRAPHIC OVERLAY: pixel-identical, razor-sharp and fully readable in every single frame. They never move, bend, redraw, re-letter, flicker or change colour. Treat them like print on a pane of glass in front of the scene. Only the photograph behind them comes alive.
2. ${split?'Both people ('+who.replace(/^the two people in the photo /,'')+') match':(known?'The person ('+who+') matches':'The person in the photo matches')} @image1 100% for the whole clip: same face, hair, facial hair, headwear and clothing. No morphing, no ageing, no new outfit.
3. THE HOOK: the first 0.5 seconds must stop the scroll (camera snap-in + flash + bass hit + eyes locking onto the viewer).
4. Real, grounded, photographic motion with sports-broadcast realism; never cartoon, never CGI, never puppet-like.
5. The final second settles back to the exact opening framing so the clip loops seamlessly (TikTok rewatches).
6. No speech, no voices, no lip movement forming words, no music: sound effects and stadium ambience only.

=== REFERENCE KEY ===
@image1: the finished Pundit Bible post graphic. Use it as the exact opening frame. The graphic layer is fixed; the photo layer inside it is the only thing that moves.

LIGHTING: keep the photo's lighting exactly as it is in @image1. Light may breathe (floodlight flicker, soft flash pops, a glow that pulses) but never changes direction, colour temperature or time of day. Not a time-lapse.

IMAGE QUALITY: crisp, high-end sports-broadcast look; real skin with pores and fine hairs; no waxy, plastic or AI-smooth face; no added grain, vignette or new filter; keep the existing colour grade.

CAMERA: ${TK.cam}

ACTING TASK: ${whoShort} (fully invested; it reads through the eyes, jaw and stillness):
SCENE DIRECTION (unspoken): ${k.dir}
MOTIVE: ${k.motive}
GOAL: ${k.goal}
TACTIC: ${k.tactic}
Moment to moment:
• 0.0–0.6s: ${Q(k.hook)}
• 0.6–3.0s: ${Q(k.build)}
• 3.0–5.0s: ${k.cpName}: ${Q(k.cp)}
• 5.0–7.0s: THE QUESTION: ${Q(k.q)}
• 7.0–8.0s: a single natural blink, then a tiny settle back into the exact opening pose.
(Safety: gaze always alive and engaged; natural blink cadence; never frozen, glassy or stiff; hands keep five fingers and correct anatomy.)

BACKGROUND & PHYSICS: ${k.bg}; light haze drifts slowly; fabric moves with real weight; background people stay soft-blurred with no visible faces.

GRAPHIC ACCENTS (light only, never redraw the graphics): at 2.0s a thin white light glint sweeps once across the headline "${P(String(headline).slice(0,60))}"; ${fx?fx+'; ':''}at 5.0s the white question bar catches one soft glow pulse. The letters themselves never move.

COMPOSITION: identical to @image1 at the start and end. ${split?'Each person':'The subject'} stays ${split?'in their own half':place}; nothing new enters the frame.

EDITING: one continuous shot; no cuts, no transitions.

ON-SCREEN TEXT: only the text already in @image1, unchanged. Add no captions, subtitles, stickers or watermarks.

AUDIO (native, no music, no speech; punchy and loud):
${k.sfx.map(s=>'• '+s).join('\n')}
Mix: the opening hit is the loudest moment; the ambience bed sits under every hit; the ending flows straight back into the opening hit so the loop feels seamless.

MOOD & TEMPO: ${k.mood}. A fast hook, a tense middle, then a held final beat that dares the viewer to comment.

SHOT BREAKDOWN:
0.0–0.6s: THE HOOK: ${Q(k.hook)}
0.6–3.0s: BUILD: ${k.build}; light sweep across the headline at 2.0s.
3.0–5.0s: ${k.cpName}: ${Q(k.cp)}
5.0–7.0s: THE QUESTION: the question bar glows; ${Q(k.q)}
7.0–8.0s: LOOP: settle back to the exact first frame.

AVOID: warped or redrawn text, moving logo or panels, face or identity change, new clothes, extra people, deformed hands, flicker, camera shake, cuts, time-lapse light, cartoon/CGI look, speech, lip-sync, music.`;
  return {prompt,negative:SEED_NEG,take:take%SEED_TAKES.length,takeName:TK.name};
}
function seedancePart2(p){
  const k=SEED_P2[p.template]||SEED_P2.headline;const f=p.fields||{};const split=p.template==='split';
  const who=split?`${f.aName||'A'} and ${f.bName||'B'}`:((p.photo&&p.photo.who)||((p.photoSearch&&p.photoSearch.term)||'the person'));
  const Q=t=>{t=String(t);return /[.?!]$/.test(t)?t:t+'.'};
  return `SEEDANCE 2.5 \u00b7 CONTINUATION (PART 2) \u00b7 9:16 vertical \u00b7 8 seconds (clip runs 8.0\u201316.0s) \u00b7 native audio ON \u00b7 no music \u00b7 no speech

CONTINUE THE VIDEO from the last frame of the attached reference clip, seamlessly, with no visual reset of any kind.

TOP PRIORITY (read first):
1. All visuals come from the last frame of @video1: the same ${split?'people':'person'}, outfit, framing, light, graphic overlay and camera position. Do not reframe, relight or restyle anything.
2. Every word, number, the Pundit Bible logo, the labels, panels and the white question bar stay a LOCKED overlay: pixel-identical and readable in every frame.
3. ${split?'Both faces':'The face'} and identity stay identical to @video1 for the whole clip.
4. No speech, no voices, no lip movement forming words, no music: sound effects and ambience only.
5. The final second lands on a strong still pose that holds, so the clip ends on a beat the viewer wants to answer.

=== REFERENCE KEY ===
@video1: Part 1 of this clip. It IS the look, the framing and the lighting. Pick up mid-motion exactly where its last frame leaves off.

ACTING TASK: ${U(String(who).split(/[,(]| in | on | at /)[0]).slice(0,40)} \u2014 ${k.name} (fully invested; it reads through the eyes and stillness):
SCENE DIRECTION (unspoken): ${k.dir}
Moment to moment:
\u2022 8.0\u201310.0s: ${Q(k.b[0])}
\u2022 10.0\u201312.5s: ${Q(k.b[1])}
\u2022 12.5\u201314.5s: ${Q(k.b[2])}
\u2022 14.5\u201316.0s: ${Q(k.b[3])}
(Safety: gaze always alive; natural blink cadence; never frozen, glassy or puppet-like; hands keep five fingers.)

PHYSICS: everything continues as in the reference: same haze, same crowd blur, same light breathing. The camera keeps its slow drift from Part 1; no new moves, no cuts.

EDITING: one continuous shot that reads as the same take as Part 1.

AUDIO (native, continuous with Part 1, no music, no speech):
${k.sfx.map(x=>'\u2022 '+x).join('\n')}
The ambience must flow on from Part 1 with no gap or jump in level.

SHOT BREAKDOWN:
8.0\u201310.0s: ${Q(k.b[0])}
10.0\u201312.5s: ${Q(k.b[1])}
12.5\u201314.5s: ${k.name}: ${Q(k.b[2])}
14.5\u201316.0s: THE HOLD: ${Q(k.b[3])}

AVOID: visual reset, reframing, relighting, warped or redrawn text, moving logo or panels, face or identity change, new clothes, extra people, deformed hands, flicker, camera shake, cuts, speech, lip-sync, music.`;
}

// ---------- Kling (via Higgsfield): short, image-locked motion prompts ----------
const KLING_FX={
  goal:'a burst of golden confetti and camera-flash sparkles, floodlights strobing in celebration',
  result:'floodlights sweeping across the background, a slow shimmer of light over the score panel',
  quote:'moody drifting smoke and a slow cold light sweep behind the person',
  stat:'an electric light pulse travelling across the background, subtle glowing particles',
  headline:'dramatic light sweep and drifting haze, like a breaking-news reveal',
  poll:'soft stadium light beams crossing behind the options',
  split:'two coloured light beams meeting in the middle behind the VS',
  h2h:'two coloured light beams from each side, subtle particles',
  versus:'floodlights warming up one by one, haze rising from the pitch',
  ratings:'slow light sweep across the background',
  guess:'mysterious drifting smoke and a flickering spotlight',
  carousel:'slow light sweep across the background',
  list:'slow light sweep and drifting haze',ranking:'slow light sweep and drifting haze'};
function klingPromptFor(p){
  const fx=KLING_FX[p.template]||'floodlights sweeping and drifting haze';
  return `Cinematic motion graphic. Keep the image exactly as it is: every word, number, logo, badge and panel stays perfectly still, sharp and unchanged, and the person stays exactly as in the photo with the same face and expression, not moving, not speaking. Animate only the atmosphere and the camera: a slow smooth push-in, ${fx}, subtle lens flare, gentle film grain. Premium sports broadcast look, 9:16.`;
}
function klingNeg(p){return 'text changing, warped letters, new words, logo morphing, face change, different person, face distortion, talking, lip movement, head turning, extra people, hands, blur, flicker, camera shake, cuts, cartoon, watermark'}
