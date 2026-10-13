// Watches the accounts you pick (Instagram: free via Business Discovery; X: pay-per-read, capped).
// When one posts a story worth covering, Claude writes Pundit Bible's OWN post about it and your phone gets an alert.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const GRAPH = "https://graph.facebook.com/v23.0";
const X_READ_USD = 0.005;
// deno-lint-ignore no-explicit-any
type Any = any;
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

export const DEFAULT_WATCH = [
  { platform: "instagram", username: "fabriziorom", name: "Fabrizio Romano", on: true },
  { platform: "instagram", username: "talksport", name: "talkSPORT", on: true },
  { platform: "instagram", username: "sportsjoedotie", name: "SportsJOE", on: true },
  { platform: "x", username: "David_Ornstein", name: "David Ornstein", on: true },
];
const TEMPLATES = ["story", "bigquote", "number", "post", "quote", "headline", "stat", "list", "poll", "split", "versus", "ranking", "carousel"];
const THEMES = ["brand", "red", "maroon", "charcoal", "navy", "sky", "green", "england", "purple"];
const CAPTION_RULES = `Caption: written like a short news story. The same caption goes on Instagram, Facebook and TikTok (the app shortens it for X). 80-150 words in 3-5 short paragraphs: (1) a headline first line under 125 characters with the key names in it (it shows before "more" and is what people search for); (2) what happened: the facts, numbers and who reported it; (3) the key quote word for word, if there is one; (4) why it matters, using only facts given; (5) ONE easy question fans will answer. Plain, punchy UK English, max 2 emojis. NEVER engagement bait ("like if", "share if", "tag a mate", "type YES"). Stay neutral on politics. Then EXACTLY 4 hashtags on the last line, the most-searched ones for this story, the same 4 used on every platform: the club or national team's most-used tag (e.g. #ManUtd #LFC #ManCity #Arsenal #Spurs #NUFC #ThreeLions), the competition (#PremierLeague #ChampionsLeague #NationsLeague #FACup), the main player or manager only if fans really search their tag (e.g. #Haaland), otherwise #FootballNews, and #Football. No brand, made-up or unrelated trending tags.`;
const FIELD_RULES = `fields, by template (short, punchy text; the image renders it in capitals; tag is a short upper-case label like "SPURS · BOTTOM OF THE LEAGUE"; question is the bar on the image, max ~40 characters, easy to answer):
  quote: {tag, quote: [2-4 short lines of the real quote, ~12 chars each], speaker, context (one line), question}
  headline: {tag, lines: [{t, c}] 2-3 lines where c is white|gold|red|accent, body (one sentence), question}
  stat: {tag, label, big (e.g. "£677.6M"), rows: [{label, value, c}] up to 3, c is red|gold|grey|white, question}
  list: {tag, title (very short, e.g. "5 OUT"), items: [up to 6 names], body, question}
  versus: {tag, title1 "Predict", title2 "the score", home, homeSub, away, awaySub, info ("Sat 3 Oct · 5pm · Anfield"), question}
  poll: {tag, title1, title2, options: [{name, sub}] exactly 4, question}
  ranking: {tag, title1, title2, rows: [{name, hi}] up to 5 (hi: "hi" to highlight, else ""), body, question}
  result: {tag (competition), label "FULL TIME", home, away, hs (number), as (number), homeScorers: ["Kane 23'"], awayScorers: [...], question}
  split: {tag, title (e.g. "Who's better?"), aName, aSub, bName, bSub, aColor, bColor (each one of red, blue, sky, navy, white, gold, green, black, orange, purple, claret), question}
  h2h: {tag "HEAD TO HEAD", aName, bName, aColor, bColor, rows: [{label, a, b, low}] up to 6 verified stats (low: "low" when lower is better, else ""), question}
  ratings: {tag "PLAYER RATINGS", title, subtitle (e.g. "England 2-1 Spain"), rows: [{name, score}] up to 11, question}
  carousel: {tag, title (cover headline), items: [{name, line}] 3-8 items, question}
  guess: {tag "GUESS THE PLAYER", clues: [3 verified clues, hardest first], answer, answerLine (one verified fact), question "Name him in the comments", revealQuestion "Did you get it?"}
  story (Instagram news card, our main format): {headline: "one sentence, 10-22 words, sentence case NOT capitals, *stars* round the 2-5 key words to show in gold", source: "outlet name, e.g. Sky Sports"}
  bigquote (Instagram quote card): {quote: "the exact quote, word for word, max 30 words, *stars* round the punchiest words", by: "short upper-case line, e.g. ROY KEANE ON HIS BIGGEST PET PEEVE"}
  number (Instagram stat card): {big: "the one big figure, e.g. 1,327 DAYS or £677.6M", text: "one sentence explaining it, *stars* round key words", source: "outlet"}
  post (a real post reacting to the story): {name, handle, text: "a REAL post copied word for word; ONLY use this if you were given the post", source}
For Instagram, prefer story, bigquote and number: they look like the big news pages and get the most reach.`;

// ---------- storage ----------
async function get(c: string, id: string) { const { data } = await sb.from("docs").select("data").eq("collection", c).eq("id", id).maybeSingle(); return data ? data.data : null; }
async function set(c: string, id: string, data: Any) { await sb.from("docs").upsert({ collection: c, id, data }, { onConflict: "collection,id" }); }
async function merge(c: string, id: string, patch: Any) { await sb.rpc("doc_merge", { p_collection: c, p_id: id, p_patch: patch }); }
async function priv(k: string) { const { data } = await sb.from("private_kv").select("v").eq("k", k).maybeSingle(); return data ? data.v : null; }
const ukDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
const ukHour = (d = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(d));
const keyOf = (a: Any) => `${a.platform}-${String(a.username).toLowerCase()}`;
const slug = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// ---------- Instagram: Business Discovery through your own connected Instagram ----------
async function igRecent(username: string) {
  const m = await priv("meta"); const page = m && ((m.pages || []).find((p: Any) => p.id === m.page) || (m.pages || [])[0]);
  if (!page || !page.ig || !page.ig.id) throw new Error("Connect Facebook & Instagram first (Quick post page).");
  const f = `business_discovery.username(${username}){username,name,followers_count,media.limit(6){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}}`;
  const j = await (await fetch(`${GRAPH}/${page.ig.id}?fields=${encodeURIComponent(f)}&access_token=${encodeURIComponent(page.token)}`)).json();
  if (j.error) throw new Error("Instagram: " + (j.error.error_user_msg || j.error.message));
  const bd = j.business_discovery || {};
  return ((bd.media && bd.media.data) || []).map((x: Any) => ({ id: x.id, text: x.caption || "", image: x.media_type === "VIDEO" ? (x.thumbnail_url || "") : (x.media_url || ""), video: x.media_type === "VIDEO", link: x.permalink, at: x.timestamp, likes: x.like_count ?? null, comments: x.comments_count ?? null }));
}

// ---------- X: OAuth 1.0a (same keys as Quick post) ----------
const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function hmacSha1(key: string, text: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text))); let bin = ""; for (const b of sig) bin += String.fromCharCode(b); return btoa(bin);
}
async function oauthHeader(method: string, url: string) {
  const u = new URL(url);
  const oauth: Record<string, string> = { oauth_consumer_key: env("X_API_KEY"), oauth_nonce: crypto.randomUUID().replace(/-/g, ""), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env("X_ACCESS_TOKEN"), oauth_version: "1.0" };
  const all: [string, string][] = [...Object.entries(oauth), ...[...u.searchParams.entries()]];
  const ps = all.map(([k, v]) => [pct(k), pct(v)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1).map(([k, v]) => `${k}=${v}`).join("&");
  oauth.oauth_signature = await hmacSha1(`${pct(env("X_API_SECRET"))}&${pct(env("X_ACCESS_SECRET"))}`, `${method}&${pct(u.origin + u.pathname)}&${pct(ps)}`);
  return "OAuth " + Object.entries(oauth).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}
const xReady = () => !!(env("X_API_KEY") && env("X_API_SECRET") && env("X_ACCESS_TOKEN") && env("X_ACCESS_SECRET"));
async function xGet(url: string) {
  const r = await fetch(url, { headers: { Authorization: await oauthHeader("GET", url) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`X ${r.status}: ${(j && (j.detail || j.title)) || ""}`.trim());
  return j;
}
async function xRecent(username: string, st: Any) {
  if (!st.uid) { const u = await xGet(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`); st.uid = u.data && u.data.id; if (!st.uid) throw new Error("X account not found"); }
  const q = new URLSearchParams({ max_results: "5", exclude: "replies,retweets", "tweet.fields": "created_at,public_metrics,attachments", expansions: "attachments.media_keys", "media.fields": "url,preview_image_url,type" });
  if (st.last) q.set("since_id", st.last);
  const j = await xGet(`https://api.x.com/2/users/${st.uid}/tweets?${q}`);
  const media: Record<string, Any> = {}; for (const m of (j.includes && j.includes.media) || []) media[m.media_key] = m;
  const out = (j.data || []).map((t: Any) => { const mk = t.attachments && t.attachments.media_keys && t.attachments.media_keys[0]; const m = mk && media[mk];
    return { id: t.id, text: t.text || "", image: m ? (m.url || m.preview_image_url || "") : "", video: !!(m && m.type !== "photo"), link: `https://x.com/${username}/status/${t.id}`, at: t.created_at, likes: t.public_metrics ? t.public_metrics.like_count : null, comments: t.public_metrics ? t.public_metrics.reply_count : null }; });
  return out;
}

// ---------- Claude ----------
async function spentOk(frac = 0.85) {
  const u = await get("meta", "usage"); const month = ukDate().slice(0, 7);
  const gbp = u && u.month === month ? Number(u.usd || 0) * Number(env("USD_TO_GBP") || 0.78) : 0;
  return gbp < Number(env("MONTHLY_BUDGET_GBP") || 10) * frac;
}
async function claude(content: Any[], maxTokens: number, system: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system, messages: [{ role: "user", content }] }) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error("Claude " + r.status + " " + JSON.stringify(out && out.error || "").slice(0, 150));
  const u = out.usage || {}; await sb.rpc("add_usage", { p_usd: Number((((u.input_tokens || 0) * 1 + (u.output_tokens || 0) * 5) / 1e6).toFixed(5)), p_doc: "usage" });
  const text = (out.content || []).filter((b: Any) => b.type === "text").map((b: Any) => b.text).join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}
async function triage(items: Any[]) {
  const list = items.map((it, n) => `${n}. [${it.name}, ${it.platform}] ${String(it.text).replace(/\s+/g, " ").slice(0, 500)}${it.video ? " (video)" : ""}`).join("\n");
  const j = await claude([{ type: "text", text: `New posts from accounts Pundit Bible watches:\n${list}\n\nFor each, score 1-10 how worth it is for Pundit Bible (UK football page, growing on Instagram) to post its OWN take on this story right now: big transfers ("here we go", medicals, bids), sackings, injuries to stars, big quotes, records, controversy score high; ads, merch, podcasts plugs, betting, quizzes, "who wins" filler, stories older than a day, and non-football score low.\nReply with only JSON: {"items":[{"n":0,"score":1-10,"story":"the story in one short line","kind":"transfer|news|quote|result|stat|other"}]}` }], 900, "You are Pundit Bible's news editor. Strict: only stories fans will comment on.");
  return Array.isArray(j.items) ? j.items : [];
}
async function draft(it: Any) {
  const content: Any[] = [];
  if (it.image && !it.video) content.push({ type: "image", source: { type: "url", url: it.image } });
  content.push({ type: "text", text: `${it.name} (${it.platform}) just posted this${it.image && !it.video ? " (their image is attached so you can read any text on it)" : ""}:\n"""${String(it.text).slice(0, 2000)}"""\nPosted ${it.at}. Link: ${it.link}

Write Pundit Bible's OWN post about this story, for Instagram first. Rules:
- Our own words and our own card: never copy their wording (except short direct quotes from players/managers, word for word), never describe or reuse their graphic.
- Use ONLY facts in their post. Don't add anything from memory. If it's a report, rumour or "here we go", say whose report it is in the caption (e.g. "Fabrizio Romano reports…"); never present a report as officially confirmed.
- A better caption than theirs: a scroll-stopping first line with the key names in it (Instagram search reads it), 1-3 short lines of context, ONE easy question fans will answer.
Use the story template unless a word-for-word quote (bigquote) or one striking number (number) tells it better. If the source is a post on X, you may use the post template with their exact words.
Reply with only JSON: {"title":"12-60 chars, names first","format":"Story card|Big quote|Big number|Post reaction|Hot quote|Stat shock","why":"1 sentence","template": one of ${TEMPLATES.join("|")},"theme": one of ${THEMES.join("|")} (club colours),"fields":{...},"caption":"...","photoSearch":{"term":"2-5 word Google Images search for the right person","tip":"what shot to pick"},"photoSearch2": only for split}
For older templates, the card's tag starts "BREAKING ·" for fresh news. For story cards, source is the outlet or person who reported it.
${CAPTION_RULES}
${FIELD_RULES}` });
  return await claude(content, 2500, "You write Pundit Bible's posts. UK English. Accurate, punchy, never copied.");
}
async function makePost(it: Any, p: Any) {
  if (!p || !TEMPLATES.includes(p.template) || !p.fields || !p.caption) throw new Error("Claude's draft was incomplete.");
  // Claude sometimes nests text as {text:"..."}: flatten IG card fields to plain text
  const str = (v: Any): string => v == null ? "" : typeof v === "string" ? v : typeof v !== "object" ? String(v) : Array.isArray(v) ? v.map(str).filter(Boolean).join(" ") : typeof v.t === "string" ? (/gold|accent|yellow/i.test(v.c || "") ? `*${v.t}*` : v.t) : (["text", "value", "headline", "quote", "title"].map((k) => v[k]).find((x) => typeof x === "string") ?? Object.values(v).map(str).filter(Boolean).join(" "));
  if (["story", "bigquote", "number", "post"].includes(p.template)) p.fields = Object.fromEntries(Object.entries(p.fields).map(([k, v]) => [k, str(v)]));
  const id = `watch-${it.platform}-${slug(it.username)}-${String(it.id).slice(-10)}`;
  const now = new Date();
  await set("posts", id, { order: -Math.round(now.getTime() / 1000), batch: ukDate(), batchLabel: `Watched · ${it.name}`, status: "todo", auto: true, when: "Post now", slot: now.toISOString(),
    sources: [{ t: `${it.name} (${it.platform === "x" ? "X" : "Instagram"})`, u: it.link }], photo: { ready: false, id: null, zoom: 1, dx: 0, dy: 0 }, theme: THEMES.includes(p.theme) ? p.theme : "brand", ...p, template: p.template });
  return id;
}
async function push(title: string, body: string, url: string, tag: string) {
  try { await fetch(`${env("SUPABASE_URL")}/functions/v1/tick`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": env("CRON_SECRET") }, body: JSON.stringify({ action: "push", title, body, url, tag }) }); } catch (_) { /* alert is best-effort */ }
}

// ---------- the check ----------
async function poll(force = false) {
  const settings = (await get("meta", "settings")) || {};
  const accounts: Any[] = Array.isArray(settings.watch) ? settings.watch : DEFAULT_WATCH;
  const minScore = Number(settings.watchMin) || 7;
  const state = (await get("meta", "watchstate")) || {};
  const month = ukDate().slice(0, 7);
  const xu = (await get("meta", "xusage")) || {}; let xSpent = xu.month === month ? Number(xu.usd || 0) : 0;
  const xCap = Number(settings.xReadCapUsd) || 3;
  const now = Date.now(); const log: string[] = []; const fresh: Any[] = [];
  for (const a of accounts) {
    if (!a.on) continue;
    const k = keyOf(a); const st = state[k] || {};
    const every = (a.platform === "x" ? 10 : 10) * 60000;
    if (!force && now - (st.checked || 0) < every) continue;
    if (a.platform === "x") {
      if (!xReady()) continue;
      if (!force && (ukHour() < 7)) continue;              // X costs per read: skip the small hours
      if (xSpent >= xCap) { st.note = `Paused: this month's X reading budget ($${xCap}) is used.`; state[k] = st; continue; }
    }
    st.checked = now;
    try {
      const posts = a.platform === "x" ? await xRecent(a.username, st) : await igRecent(a.username);
      if (a.platform === "x") { xSpent += posts.length * X_READ_USD + (st.uidCharged ? 0 : 0.01); st.uidCharged = true; }
      const first = !st.lastAt && !st.last;
      const newer = posts.filter((p: Any) => a.platform === "x" ? (!st.last || BigInt(p.id) > BigInt(st.last)) : (!st.lastAt || Date.parse(p.at) > Date.parse(st.lastAt)));
      if (posts.length) { if (a.platform === "x") st.last = posts.map((p: Any) => p.id).sort((x: string, y: string) => (BigInt(y) > BigInt(x) ? 1 : -1))[0]; else st.lastAt = posts.map((p: Any) => p.at).sort().pop(); }
      st.error = null; st.note = null;
      if (first) { log.push(`${k}: first look, ${posts.length} existing posts noted`); state[k] = st; continue; } // don't flood you with old posts
      for (const p of newer) if (now - Date.parse(p.at) < 24 * 3600e3) fresh.push({ ...p, platform: a.platform, username: a.username, name: a.name || a.username });
    } catch (e: Any) { st.error = String(e.message || e).slice(0, 200); log.push(`${k}: ${st.error}`); }
    state[k] = st;
  }
  await set("meta", "watchstate", state);
  if (xSpent !== (xu.month === month ? Number(xu.usd || 0) : 0)) await set("meta", "xusage", { month, usd: Math.round(xSpent * 1000) / 1000 });
  if (!fresh.length) return log;
  for (const it of fresh) await set("watch", `${it.platform}-${slug(it.username)}-${it.id}`, { ...it, status: "new", seenAt: new Date().toISOString() });
  if (!env("ANTHROPIC_API_KEY") || !(await spentOk())) { log.push("Claude budget: stored without drafting"); return log; }
  const scores = await triage(fresh).catch((e) => { log.push("triage: " + e); return []; });
  let drafted = 0;
  for (let n = 0; n < fresh.length; n++) {
    const it = fresh[n]; const s = scores.find((x: Any) => Number(x.n) === n) || { score: 0, story: "" };
    const id = `${it.platform}-${slug(it.username)}-${it.id}`;
    const patch: Any = { score: Number(s.score) || 0, story: String(s.story || "").slice(0, 140), kind: s.kind || "", status: "skipped" };
    if (patch.score >= minScore && drafted < 3) {
      try { const pid = await makePost(it, await draft(it)); patch.status = "drafted"; patch.post = pid; drafted++;
        await push(`⚡ ${it.name}: ${patch.story || "new story"}`.slice(0, 110), "Your own post is drafted. Tap to add a photo and post it.", `./#post/${pid}`, "watch-" + id); }
      catch (e: Any) { patch.error = String(e.message || e).slice(0, 200); }
    }
    await merge("watch", id, patch);
  }
  log.push(`${fresh.length} new, ${drafted} drafted`);
  return log;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const isCron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!isCron) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: usr } = await sb.auth.getUser(token);
    if (!usr || !usr.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);
  }
  try {
    if (body.action === "poll") return json({ log: await poll(!!body.force && !isCron ? true : false) });
    if (!isCron && body.action === "draft") {
      const it = await get("watch", String(body.id)); if (!it) return json({ code: "not_found", message: "Not found" }, 404);
      if (!(await spentOk(1))) return json({ code: "budget", message: "This month's Claude budget is used up." });
      const pid = await makePost(it, await draft(it));
      await merge("watch", String(body.id), { status: "drafted", post: pid, error: null });
      return json({ post: pid });
    }
    if (!isCron && body.action === "defaults") return json({ accounts: DEFAULT_WATCH });
    return json({ code: "bad_request", message: "Unknown action" }, 400);
  } catch (e: Any) {
    return json({ code: "error", message: String((e && e.message) || e).slice(0, 300) }, 500);
  }
});
