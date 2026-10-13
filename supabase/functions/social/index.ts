// Quick post: sends a card image + caption to Facebook, Instagram and X in one go.
// Facebook/Instagram use the page connection made on the Earnings page; X uses the four X keys.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const GRAPH = "https://graph.facebook.com/v23.0";
// deno-lint-ignore no-explicit-any
type Any = any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function priv(k: string) { const { data } = await sb.from("private_kv").select("v").eq("k", k).maybeSingle(); return data ? data.v : null; }
async function metaPage() { const m = await priv("meta"); if (!m) return null; return (m.pages || []).find((p: Any) => p.id === m.page) || (m.pages || [])[0] || null; }
const xReady = () => !!(env("X_API_KEY") && env("X_API_SECRET") && env("X_ACCESS_TOKEN") && env("X_ACCESS_SECRET"));
function b64ToBytes(b64: string) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
const fbErr = (j: Any) => (j && j.error && (j.error.error_user_msg || j.error.message)) || "unknown error";

// ---------- Facebook ----------
async function postFacebook(page: Any, imageUrl: string, caption: string) {
  const r = await fetch(`${GRAPH}/${page.id}/photos`, { method: "POST", body: new URLSearchParams({ url: imageUrl, message: caption, published: "true", access_token: page.token }) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(fbErr(j));
  const pid = j.post_id || j.id;
  return { id: pid, url: `https://www.facebook.com/${pid}` };
}

// ---------- Instagram (make a container, wait for it, publish it) ----------
async function postInstagram(page: Any, imageUrl: string, caption: string) {
  if (!page.ig || !page.ig.id) throw new Error("No Instagram account is linked to this Facebook page. Link it in Instagram (Settings → Account type and tools → switch to Professional, then link the Pundit Bible page), then tap Reconnect.");
  const c = await (await fetch(`${GRAPH}/${page.ig.id}/media`, { method: "POST", body: new URLSearchParams({ image_url: imageUrl, caption, access_token: page.token }) })).json();
  if (c.error || !c.id) throw new Error(fbErr(c));
  for (let i = 0; i < 20; i++) {
    const s = await (await fetch(`${GRAPH}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(page.token)}`)).json();
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram couldn't process the image (" + (s.status || s.status_code) + ").");
    await sleep(2000);
  }
  const p = await (await fetch(`${GRAPH}/${page.ig.id}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: c.id, access_token: page.token }) })).json();
  if (p.error || !p.id) throw new Error(fbErr(p));
  let url = "https://www.instagram.com/" + (page.ig.username || "");
  try { const l = await (await fetch(`${GRAPH}/${p.id}?fields=permalink&access_token=${encodeURIComponent(page.token)}`)).json(); if (l.permalink) url = l.permalink; } catch (_) { /* profile link is fine */ }
  return { id: p.id, url };
}

// ---------- X (OAuth 1.0a user context) ----------
const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function hmacSha1(key: string, text: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text)));
  let bin = ""; for (const b of sig) bin += String.fromCharCode(b); return btoa(bin);
}
export async function oauthHeader(method: string, url: string, extra: Record<string, string> = {}, fixed?: { nonce: string; ts: string }) {
  const u = new URL(url);
  const oauth: Record<string, string> = { oauth_consumer_key: env("X_API_KEY"), oauth_nonce: fixed ? fixed.nonce : crypto.randomUUID().replace(/-/g, ""), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: fixed ? fixed.ts : String(Math.floor(Date.now() / 1000)), oauth_token: env("X_ACCESS_TOKEN"), oauth_version: "1.0" };
  const all: [string, string][] = [...Object.entries(oauth), ...Object.entries(extra), ...[...u.searchParams.entries()]];
  const paramStr = all.map(([k, v]) => [pct(k), pct(v)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1).map(([k, v]) => `${k}=${v}`).join("&");
  const base = `${method.toUpperCase()}&${pct(u.origin + u.pathname)}&${pct(paramStr)}`;
  oauth.oauth_signature = await hmacSha1(`${pct(env("X_API_SECRET"))}&${pct(env("X_ACCESS_SECRET"))}`, base);
  return "OAuth " + Object.entries(oauth).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}
async function xUpload(bytes: Uint8Array) {
  // current media upload endpoint; falls back to the older one if this account still uses it
  const tryUpload = async (url: string) => {
    const fd = new FormData();
    fd.append("media", new Blob([bytes], { type: "image/jpeg" }), "card.jpg");
    fd.append("media_category", "tweet_image");
    const r = await fetch(url, { method: "POST", headers: { Authorization: await oauthHeader("POST", url) }, body: fd });
    const t = await r.text(); let j: Any = {}; try { j = JSON.parse(t); } catch { j = { raw: t }; }
    return { r, j };
  };
  let { r, j } = await tryUpload("https://api.x.com/2/media/upload");
  if (r.ok) { const id = (j.data && (j.data.id || j.data.media_id_string)) || j.media_id_string; if (id) return String(id); }
  if (r.status === 404 || r.status === 410 || r.status === 400) {
    ({ r, j } = await tryUpload("https://upload.twitter.com/1.1/media/upload.json"));
    if (r.ok && j.media_id_string) return j.media_id_string;
  }
  throw new Error(xErr(r.status, j, "image upload"));
}
function xErr(status: number, j: Any, what: string) {
  const d = (j && (j.detail || j.title || (j.errors && j.errors[0] && (j.errors[0].message || j.errors[0].detail)))) || (j && j.raw && String(j.raw).slice(0, 120)) || "";
  if (status === 401) return "X didn't accept the keys (401). Check the four X secrets, and that the access token was made after setting the app to Read and write.";
  if (status === 402 || /credit|payment|billing/i.test(d)) return "X says there's no credit on your developer account. Add some in the X developer portal (Billing).";
  if (status === 403) return "X refused the " + what + " (403): " + (d || "check the app has Read and write permission, then regenerate the access token.");
  if (status === 429) return "X's rate limit was hit. Try again in a few minutes.";
  return `X ${what} failed (${status})${d ? ": " + d : ""}`;
}
async function postX(bytes: Uint8Array, text: string) {
  const media = await xUpload(bytes);
  const url = "https://api.x.com/2/tweets";
  const r = await fetch(url, { method: "POST", headers: { Authorization: await oauthHeader("POST", url), "Content-Type": "application/json" }, body: JSON.stringify({ text, media: { media_ids: [media] } }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.data || !j.data.id) throw new Error(xErr(r.status, j, "post"));
  return { id: j.data.id, url: `https://x.com/i/web/status/${j.data.id}` };
}


// ---------- match hashtags: what the teams, the competition and broadcasters are using for THIS game ----------
const slugify = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const tagKey = (home: string, away: string, date: string) => `${date}-${slugify(home)}-v-${slugify(away)}`;
async function researchTags(m: Any) {
  const topic = !!m.topic;
  if (!env("ANTHROPIC_API_KEY")) throw new Error("The Claude key isn't set up.");
  const u = await (await sb.from("docs").select("data").eq("collection", "meta").eq("id", "usage").maybeSingle()).data;
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()).slice(0, 7);
  const spent = u && u.data && u.data.month === month ? Number(u.data.usd || 0) * Number(env("USD_TO_GBP") || 0.78) : 0;
  if (spent >= Number(env("MONTHLY_BUDGET_GBP") || 10)) throw new Error("This month's Claude budget is used up.");
  const prompt = topic ? `Find the hashtags people are actually using and searching for this football story right now, for posting on X, Instagram and Facebook from a UK football page.

Story: ${String(m.title || "").slice(0, 200)}
${String(m.caption || "").slice(0, 600)}

Search the web now. Look for: the official hashtags of the clubs, national teams or competitions involved (e.g. #MUFC, #LFC, #COYS, #ThreeLions, #UCL), any hashtag already being used for this specific story or event (a transfer, a sacking, a record), and player or manager tags only if people really use them. Prefer tags you can see being used in the last few days. Rank them by how many people use and search them: the big club, team and competition tags with millions of posts beat niche ones, and a story-specific tag only earns a spot if it's clearly being used widely. Never include generic filler like #fyp, #viral, #sport, #soccer, #news.

Reply with only JSON:
{"match":"","tags":[EXACTLY 4 tags, the most searched for this story first, used on every platform],"why":"one short line on where these come from","sources":["url", "url"]}` : `Find the hashtags people are actually using and searching for this football match, for posting on X, Instagram and Facebook from a UK football page.

Match: ${m.home} v ${m.away}${m.comp ? " (" + m.comp + ")" : ""}, ${m.date}.

Search the web now. Look for: the official match hashtag the two teams' official accounts use (e.g. England's FA uses the format #ENGESP: home code then away code), each team's official hashtag (e.g. #ThreeLions), the competition's official hashtag (e.g. #NationsLeague, #UCL, #PL), and any hashtag the broadcaster is pushing for this game. Prefer tags you can see being used for THIS match. Rank them by how many people use and search them: the big team and competition tags with millions of posts beat niche ones. Never include generic filler like #fyp, #viral, #sport or #soccer.

Reply with only JSON:
{"match":"the single official match tag e.g. #ENGESP","tags":[EXACTLY 4 tags including the match tag, most searched first, used on every platform],"why":"one short line on where these come from","sources":["url", "url"]}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1200, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "GB", timezone: "Europe/London" } }],
      system: "You find the real, current hashtags for football matches. Only hashtags you have evidence for. UK English.", messages: [{ role: "user", content: prompt }] }),
  });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error("Claude couldn't research the hashtags (" + r.status + ").");
  const us = out.usage || {};
  const usd = ((us.input_tokens || 0) * 1 + (us.output_tokens || 0) * 5) / 1e6 + ((us.server_tool_use && us.server_tool_use.web_search_requests) || 0) * 0.01;
  await sb.rpc("add_usage", { p_usd: Number(usd.toFixed(5)), p_doc: "usage" });
  const text = (out.content || []).filter((b: Any) => b.type === "text").map((b: Any) => b.text).join("");
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const clean = (a: Any, n: number) => (Array.isArray(a) ? a : []).map((t: Any) => "#" + String(t).replace(/^#+/, "").replace(/[^A-Za-z0-9_\u00C0-\u017F]/g, "")).filter((t: string) => t.length > 2 && !/^#(fyp|foryou|viral|sport|sports|soccer)$/i.test(t)).slice(0, n);
  const doc = { topic: topic ? String(m.key || "") : undefined, title: topic ? String(m.title || "").slice(0, 120) : undefined, home: m.home, away: m.away, comp: m.comp || "", date: m.date, match: clean([j.match], 1)[0] || "", tags: clean(j.tags || j.x, 4), x: clean(j.tags || j.x, 4), instagram: clean(j.tags || j.instagram, 4), facebook: clean(j.tags || j.facebook, 4), why: String(j.why || "").slice(0, 200), sources: (Array.isArray(j.sources) ? j.sources : []).slice(0, 4), at: new Date().toISOString() };
  await sb.from("docs").upsert({ collection: "hashtags", id: topic ? "topic-" + slugify(String(m.key || m.title)).slice(0, 80) : tagKey(m.home, m.away, m.date), data: JSON.parse(JSON.stringify(doc)) }, { onConflict: "collection,id" });
  return doc;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const isCron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!isCron) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: usr } = await sb.auth.getUser(token);
    if (!usr || !usr.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);
  } else if (body.action !== "tags") return json({ code: "not_granted", message: "Not allowed" }, 401);
  try {
    if (body.action === "status") {
      const page = await metaPage();
      return json({ facebook: page ? { name: page.name } : null, instagram: page && page.ig ? { username: page.ig.username || "" } : null, x: xReady(), metaApp: !!env("META_APP_ID") });
    }
    if (body.action === "tags") {
      if (body.topic) return json(await researchTags({ topic: true, key: String(body.key || body.title || ""), title: String(body.title || ""), caption: String(body.caption || "") }));
      if (!body.home || !body.away) return json({ code: "bad_request", message: "Which match?" }, 400);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
      return json(await researchTags({ home: String(body.home), away: String(body.away), comp: String(body.comp || ""), date }));
    }
    if (body.action === "post") {
      const targets = body.targets || {};
      if (!body.image) return json({ code: "bad_request", message: "No image." }, 400);
      const bytes = b64ToBytes(String(body.image));
      if (bytes.length > 8 * 1024 * 1024) return json({ code: "bad_request", message: "The image is too big (over 8 MB)." }, 400);
      const path = `social/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const up = await sb.storage.from("photos").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (up.error) return json({ code: "error", message: "Couldn't store the image: " + up.error.message }, 500);
      const signed = await sb.storage.from("photos").createSignedUrl(path, 3600);
      const imageUrl = signed.data && signed.data.signedUrl;
      const page = (targets.facebook != null || targets.instagram != null) ? await metaPage() : null;
      const jobs: Record<string, Promise<Any>> = {};
      const noMeta = () => Promise.reject(new Error("Facebook isn't connected yet. Tap Connect Facebook & Instagram on the Quick post page."));
      if (targets.facebook != null) jobs.facebook = page ? postFacebook(page, imageUrl!, String(targets.facebook)) : noMeta();
      if (targets.instagram != null) jobs.instagram = page ? postInstagram(page, imageUrl!, String(targets.instagram)) : noMeta();
      if (targets.x != null) jobs.x = xReady() ? postX(bytes, String(targets.x).slice(0, 280)) : Promise.reject(new Error("X isn't connected yet: add the four X keys to GitHub (setup guide, step 11)."));
      const names = Object.keys(jobs);
      const settled = await Promise.allSettled(names.map((n) => jobs[n]));
      const results: Record<string, Any> = {};
      names.forEach((n, i) => { const s = settled[i]; results[n] = s.status === "fulfilled" ? { ok: true, ...s.value } : { ok: false, message: String((s.reason && s.reason.message) || s.reason).slice(0, 300) }; });
      const at = new Date().toISOString();
      const logId = at.replace(/[:.]/g, "-");
      await sb.from("docs").upsert({ collection: "social", id: logId, data: { at, post: body.post || null, title: String(body.title || "").slice(0, 120), file: path, results } }, { onConflict: "collection,id" });
      if (body.post && Object.values(results).some((r: Any) => r.ok)) {
        const { data: cur } = await sb.from("docs").select("data").eq("collection", "posts").eq("id", String(body.post)).maybeSingle();
        const prev = (cur && cur.data && cur.data.social) || {};
        const add: Any = {}; for (const [k, r] of Object.entries(results)) if ((r as Any).ok) add[k] = { url: (r as Any).url, at };
        await sb.rpc("doc_merge", { p_collection: "posts", p_id: String(body.post), p_patch: { social: { ...prev, ...add }, status: "posted", postedAt: at } });
      }
      return json({ results });
    }
    return json({ code: "bad_request", message: "Unknown action" }, 400);
  } catch (e: Any) {
    return json({ code: "error", message: String((e && e.message) || e).slice(0, 300) }, 500);
  }
});
