// Shared helpers for the scheduled jobs (run by GitHub Actions).
const REF = process.env.SUPABASE_PROJECT_REF;
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
export const SB_URL = `https://${REF}.supabase.co`;

export function need(...names) {
  const miss = names.filter((n) => !process.env[n]);
  if (miss.length) { console.error("Missing GitHub secret/variable: " + miss.join(", ") + ". See the setup guide."); process.exit(1); }
}

// Supabase Management API (uses your personal access token)
export async function mgmt(path, opts = {}) {
  const r = await fetch("https://api.supabase.com" + path, {
    ...opts,
    headers: { Authorization: "Bearer " + PAT, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${path} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
export async function keys() {
  const list = await mgmt(`/v1/projects/${REF}/api-keys?reveal=true`);
  const pick = (name, type) => (list.find((k) => k.name === name && k.api_key) || list.find((k) => k.type === type && k.api_key) || {}).api_key;
  return { anon: pick("anon", "publishable"), service: pick("service_role", "secret") };
}

let SERVICE = null;
async function svcHeaders(extra = {}) {
  if (!SERVICE) SERVICE = (await keys()).service;
  const h = { apikey: SERVICE, "Content-Type": "application/json", ...extra };
  if (SERVICE.startsWith("eyJ")) h.Authorization = "Bearer " + SERVICE;
  return h;
}
async function rest(path, opts = {}) {
  const r = await fetch(SB_URL + "/rest/v1" + path, { ...opts, headers: await svcHeaders(opts.headers) });
  const t = await r.text();
  if (!r.ok) throw new Error(`DB ${path} ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
export const db = {
  async list(c) { return (await rest(`/docs?collection=eq.${encodeURIComponent(c)}&select=id,data&limit=5000`)).map((r) => ({ id: r.id, ...r.data })); },
  async set(c, id, data) { await rest(`/docs?on_conflict=collection,id`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ collection: c, id, data, updated_at: new Date().toISOString() }) }); },
  async update(c, id, patch) { await rest(`/rpc/doc_merge`, { method: "POST", body: JSON.stringify({ p_collection: c, p_id: id, p_patch: patch }) }); },
  async del(c, id) { await rest(`/docs?collection=eq.${encodeURIComponent(c)}&id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async upload(name, buf, type) {
    const r = await fetch(`${SB_URL}/storage/v1/object/photos/${encodeURIComponent(name)}`, { method: "POST", headers: { ...(await svcHeaders({ "Content-Type": type, "x-upsert": "true" })) }, body: buf });
    if (!r.ok) throw new Error("upload " + r.status + " " + (await r.text()).slice(0, 200));
  },
};

// ---------- cost tracking and the monthly budget ----------
export const PRICES = { "claude-sonnet-5": [2, 10], "claude-haiku-4-5": [1, 5], "claude-haiku-4-5-20251001": [1, 5], "claude-opus-5-5": [4, 20] }; // $ per million tokens in/out
export const SEARCH_USD = 0.01;
export const BUDGET_GBP = Number(process.env.MONTHLY_BUDGET_GBP || 10);
export const USD_TO_GBP = Number(process.env.USD_TO_GBP || 0.78);
let spentUsd = 0;
export async function usage() { const r = (await db.list("meta")).find((d) => d.id === "usage"); const m = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7); return r && r.month === m ? r.usd || 0 : 0; }
// Scheduled jobs stop at 85% of the budget so the app's buttons keep working to the end of the month.
export async function budgetLeft() { const usd = await usage(); const gbp = usd * USD_TO_GBP; console.log(`Claude spend this month: £${gbp.toFixed(2)} of £${BUDGET_GBP}`); return gbp < BUDGET_GBP * 0.85; }
export async function recordSpend() { if (spentUsd > 0) { await rest(`/rpc/add_usage`, { method: "POST", body: JSON.stringify({ p_usd: Number(spentUsd.toFixed(5)) }) }); console.log(`This run cost about £${(spentUsd * USD_TO_GBP).toFixed(3)}`); spentUsd = 0; } }
const MODEL_MAIN = () => process.env.CLAUDE_MODEL || "claude-sonnet-5";
export const MODEL_CHEAP = "claude-haiku-4-5-20251001";

// One Claude call. search: number of web searches allowed (0 = none, the cheap default).
export async function claude({ system, prompt, model, search = 0, maxTokens = 8000 }) {
  model = model || MODEL_MAIN();
  const messages = [{ role: "user", content: prompt }];
  const tools = search ? [{ type: "web_search_20250305", name: "web_search", max_uses: search, user_location: { type: "approximate", country: "GB", timezone: "Europe/London" } }] : undefined;
  for (let i = 0; i < 8; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, ...(tools ? { tools } : {}) }),
    });
    const out = await r.json();
    if (!r.ok) throw new Error("Claude " + r.status + ": " + JSON.stringify(out).slice(0, 400));
    const u = out.usage || {}; const p = PRICES[model] || [2, 10];
    spentUsd += ((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0)) * p[0] / 1e6 + (u.cache_read_input_tokens || 0) * p[0] * 0.1 / 1e6 + (u.output_tokens || 0) * p[1] / 1e6 + ((u.server_tool_use && u.server_tool_use.web_search_requests) || 0) * SEARCH_USD;
    if (out.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: out.content }); continue; }
    return out.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  throw new Error("Claude kept pausing");
}

// ---------- free news feeds ----------
export const FEEDS = [
  ["BBC Sport", "https://feeds.bbci.co.uk/sport/football/rss.xml"],
  ["BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"],
  ["Sky Sports", "https://www.skysports.com/rss/12040"],
  ["The Guardian", "https://www.theguardian.com/football/rss"],
  ["ESPN", "https://www.espn.com/espn/rss/soccer/news"],
];
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PunditBibleStudio/1.0)" };
const decode = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n)).replace(/\s+/g, " ").trim();
export async function readFeeds(hours) {
  const since = Date.now() - hours * 3600e3; const all = []; const seen = new Set();
  await Promise.all(FEEDS.map(async ([name, url]) => {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) { console.log("feed failed", name, r.status); return; }
      const x = await r.text();
      for (const m of x.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
        const it = m[0]; const g = (t) => { const mm = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return mm ? decode(mm[1]) : ""; };
        const link = g("link").split("?")[0]; const t = Date.parse(g("pubDate")) || 0;
        if (!link || t < since || seen.has(link)) continue; seen.add(link);
        all.push({ outlet: name, title: g("title"), summary: g("description").slice(0, 300), link, at: new Date(t).toISOString() });
      }
    } catch (e) { console.log("feed error", name, e.message); }
  }));
  return all.sort((a, b) => b.at.localeCompare(a.at));
}
export async function articleText(url, max = 5000) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) return "";
    const h = (await r.text()).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
    const ps = [...h.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)].map((m) => decode(m[0])).filter((t) => t.length > 40 && !/cookie|subscribe|sign up|newsletter|©/i.test(t));
    return ps.join("\n").slice(0, max);
  } catch { return ""; }
}

export function parseJSON(t) {
  t = String(t || "");
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cands = [fence && fence[1], t];
  for (const c of cands) {
    if (!c) continue;
    try { return JSON.parse(c); } catch {}
    const s = c.indexOf("{"), e = c.lastIndexOf("}");
    if (s >= 0 && e > s) { try { return JSON.parse(c.slice(s, e + 1)); } catch {} }
  }
  throw new Error("Claude's answer wasn't valid JSON:\n" + t.slice(0, 1500));
}
export function ukNow() {
  const d = new Date();
  const f = (o) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ...o }).format(d);
  return { iso: d.toISOString(), date: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d), label: f({ weekday: "short", day: "numeric", month: "short" }), time: f({ hour: "2-digit", minute: "2-digit" }), full: f({ dateStyle: "full", timeStyle: "short" }) };
}
export const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
export const CAPTION_RULES = `Caption (this is the Facebook caption; the app builds the Instagram, TikTok and YouTube versions from it): hook line under 125 characters, 2-4 short lines of context, ONE clear easy-to-answer question, then EXACTLY 3 hashtags on the last line (Facebook's guidance: one broad + one niche + one about the content): (1) the club's or player's most-used tag (e.g. #LFC, #ManUtd, #ManCity, #Arsenal, #Spurs, #NUFC, #Haaland), (2) the competition or broad tag (#PremierLeague, #ChampionsLeague, #NationsLeague, #Football; #Boxing for boxing), (3) the post type (#FootballNews, #FootballDebate, #MatchDay, #PlayerRatings, #GuessThePlayer, #WhoWins). Only relevant tags, never unrelated trending ones. Max 2 emojis. NEVER engagement bait ("like if", "share if", "tag a mate", "type YES"). Stay neutral on politics.`;
export const FIELD_RULES = `fields, by template (short, punchy text; the image renders it in capitals; tag is a short upper-case label like "SPURS · BOTTOM OF THE LEAGUE"; question is the bar on the image, max ~40 characters, easy to answer):
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
  guess: {tag "GUESS THE PLAYER", clues: [3 verified clues, hardest first], answer, answerLine (one verified fact), question "Name him in the comments", revealQuestion "Did you get it?"}`;
export const TEMPLATES = ["quote", "headline", "stat", "list", "versus", "poll", "ranking", "result", "split", "ratings", "carousel", "guess", "h2h"];
export const THEMES = ["brand", "red", "maroon", "charcoal", "navy", "sky", "green", "england", "purple"];
export const blankPhoto = () => ({ ready: false, id: null, zoom: 1, dx: 0, dy: 0 });
