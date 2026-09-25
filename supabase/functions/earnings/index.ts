// Earnings: your YouTube and Facebook money, pulled daily and shown in pounds.
// Sign-in keys (tokens) are kept in a private table the app itself can't read.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const REDIRECT = `${env("SUPABASE_URL")}/functions/v1/earnings`;
const GRAPH = "https://graph.facebook.com/v23.0";
const G_SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly", "https://www.googleapis.com/auth/yt-analytics-monetary.readonly", "https://www.googleapis.com/auth/youtube.readonly"];
// deno-lint-ignore no-explicit-any
type Any = any;

// ---------- storage ----------
async function priv(k: string) { const { data } = await sb.from("private_kv").select("v").eq("k", k).maybeSingle(); return data ? data.v : null; }
async function privSet(k: string, v: Any) { const { error } = await sb.from("private_kv").upsert({ k, v, updated_at: new Date().toISOString() }, { onConflict: "k" }); if (error) throw new Error("Couldn't save the sign-in (" + error.message + "). Re-run “1. Set up” on GitHub, then try again."); }
async function privDel(k: string) { await sb.from("private_kv").delete().eq("k", k); }
async function merge(c: string, id: string, patch: Any) { await sb.rpc("doc_merge", { p_collection: c, p_id: id, p_patch: patch }); }

const ukDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- sign-in (Google for YouTube, Facebook Login for your page) ----------
async function startAuth(provider: string, back: string) {
  if (!/^https:\/\//.test(back) && !/^http:\/\/localhost/.test(back)) throw new Error("Open the Studio from its web address to connect.");
  const state = (provider === "google" ? "g" : "f") + crypto.randomUUID().replace(/-/g, "");
  await privSet("state:" + state, { provider, back, at: Date.now() });
  if (provider === "google") {
    if (!env("GOOGLE_CLIENT_ID")) throw new Error("YouTube isn't set up yet: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (setup guide, step 10).");
    const q = new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: REDIRECT, response_type: "code", scope: G_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
    return "https://accounts.google.com/o/oauth2/v2/auth?" + q;
  }
  if (!env("META_APP_ID")) throw new Error("Facebook isn't set up yet: add META_APP_ID and META_APP_SECRET (setup guide, step 10).");
  const q = new URLSearchParams({ client_id: env("META_APP_ID"), redirect_uri: REDIRECT, state, response_type: "code", scope: "pages_show_list,pages_read_engagement,read_insights" });
  return "https://www.facebook.com/v23.0/dialog/oauth?" + q;
}
async function finishAuth(u: URL) {
  const state = u.searchParams.get("state") || "";
  const st = state ? await priv("state:" + state) : null;
  if (!st || Date.now() - st.at > 20 * 60000) return { back: st && st.back, result: "expired" };
  await privDel("state:" + state);
  if (u.searchParams.get("error")) return { back: st.back, result: "cancelled" };
  const code = u.searchParams.get("code") || "";
  if (st.provider === "google") {
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: REDIRECT, grant_type: "authorization_code" }) });
    const j = await r.json();
    if (!j.refresh_token) return { back: st.back, result: "yt-failed", why: j.error_description || j.error || "no refresh token" };
    await privSet("google", { refresh: j.refresh_token, at: new Date().toISOString() });
    let channel = "";
    try { const c = await (await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: "Bearer " + j.access_token } })).json(); channel = (c.items && c.items[0] && c.items[0].snippet.title) || ""; } catch (_) { /* name only */ }
    await merge("meta", "earn_yt", { connected: true, channel, error: null, since: new Date().toISOString() });
    return { back: st.back, result: "yt-ok" };
  }
  const q = new URLSearchParams({ client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri: REDIRECT, code });
  const t1 = await (await fetch(`${GRAPH}/oauth/access_token?${q}`)).json();
  if (!t1.access_token) return { back: st.back, result: "fb-failed", why: (t1.error && t1.error.message) || "no token" };
  // swap for a long-lived token: page tokens made from it don't expire
  const t2 = await (await fetch(`${GRAPH}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), fb_exchange_token: t1.access_token })}`)).json();
  const userToken = t2.access_token || t1.access_token;
  const pj = await (await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&limit=50&access_token=${encodeURIComponent(userToken)}`)).json();
  const pages = (pj.data || []).map((p: Any) => ({ id: p.id, name: p.name, token: p.access_token }));
  if (!pages.length) return { back: st.back, result: "fb-nopage" };
  const pick = pages.find((p: Any) => /pundit/i.test(p.name)) || pages[0];
  await privSet("meta", { pages, page: pick.id, at: new Date().toISOString() });
  await merge("meta", "earn_fb", { connected: true, page: pick.name, pageId: pick.id, pages: pages.map((p: Any) => ({ id: p.id, name: p.name })), error: null, since: new Date().toISOString() });
  return { back: st.back, result: "fb-ok" };
}

// ---------- money helpers ----------
// Meta sends earnings in a few shapes depending on version: a number, {amount, currency}, micro-amounts, or a breakdown by content type.
function money(v: Any): { amt: number; cur: string } {
  if (v == null) return { amt: 0, cur: "" };
  if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))) return { amt: Number(v), cur: "" };
  if (typeof v !== "object") return { amt: 0, cur: "" };
  const cur = String(v.currency || v.currency_code || "");
  for (const k of ["amount", "value", "earnings", "total"]) if (v[k] != null && !isNaN(Number(v[k]))) return { amt: Number(v[k]), cur };
  for (const k of ["micro_amount", "microAmount", "amount_in_micros"]) if (v[k] != null) return { amt: Number(v[k]) / 1e6, cur };
  for (const k of ["amount_in_cents", "cents"]) if (v[k] != null) return { amt: Number(v[k]) / 100, cur };
  let sum = 0; let c2 = cur; // breakdown: add up the parts
  for (const [k, x] of Object.entries(v)) { if (/currency/i.test(k)) continue; const m = money(x); sum += m.amt; c2 = c2 || m.cur; }
  return { amt: sum, cur: c2 };
}
async function usdToGbpRates(from: string, to: string) {
  const out: Record<string, number> = {};
  try {
    const j = await (await fetch(`https://api.frankfurter.dev/v1/${addDays(from, -5)}..${to}?base=USD&symbols=GBP`)).json();
    for (const [d, r] of Object.entries(j.rates || {})) out[d] = Number((r as Any).GBP);
  } catch (e) { console.log("fx", String(e)); }
  if (!Object.keys(out).length) {
    try { const j = await (await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP")).json(); if (j.rates && j.rates.GBP) out[j.date || to] = Number(j.rates.GBP); } catch (_) { /* fallback below */ }
  }
  // weekends and bank holidays use the last working day's rate
  const rate = (d: string) => { for (let i = 0; i < 10; i++) { const k = addDays(d, -i); if (out[k]) return out[k]; } const ks = Object.keys(out).sort(); return ks.length ? out[ks[ks.length - 1]] : Number(env("USD_TO_GBP") || 0.78); };
  return rate;
}

// ---------- YouTube ----------
async function googleToken() {
  const g = await priv("google"); if (!g) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), refresh_token: g.refresh, grant_type: "refresh_token" }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error === "invalid_grant" ? "YouTube sign-in has expired. Tap Connect YouTube again." : "Google said: " + (j.error_description || j.error));
  return j.access_token as string;
}
async function ytReport(tok: string, p: Record<string, string>) {
  const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?" + new URLSearchParams({ ids: "channel==MINE", currency: "GBP", ...p }), { headers: { Authorization: "Bearer " + tok } });
  const j = await r.json();
  if (!r.ok) throw new Error("YouTube: " + ((j.error && j.error.message) || r.status));
  const cols = (j.columnHeaders || []).map((c: Any) => c.name);
  return (j.rows || []).map((row: Any[]) => Object.fromEntries(cols.map((c: string, i: number) => [c, row[i]])));
}
async function syncYouTube(days: number) {
  const tok = await googleToken(); if (!tok) return null;
  const end = ukDate(); const start = addDays(end, -days);
  const rows = await ytReport(tok, { startDate: start, endDate: end, metrics: "estimatedRevenue,views", dimensions: "day", sort: "day" });
  for (const r of rows) await merge("earnings", r.day, { yt: { gbp: r2(Number(r.estimatedRevenue || 0)), views: Number(r.views || 0) } });
  const extra: Any = {};
  try {
    const top = await ytReport(tok, { startDate: addDays(end, -28), endDate: end, metrics: "estimatedRevenue,views", dimensions: "video", sort: "-estimatedRevenue", maxResults: "10" });
    const ids = top.map((t: Any) => t.video).join(",");
    const titles: Record<string, string> = {};
    if (ids) { const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}`, { headers: { Authorization: "Bearer " + tok } })).json(); for (const it of v.items || []) titles[it.id] = it.snippet.title; }
    extra.top = top.map((t: Any) => ({ id: t.video, title: titles[t.video] || t.video, gbp: r2(Number(t.estimatedRevenue || 0)), views: Number(t.views || 0), url: "https://youtube.com/watch?v=" + t.video }));
  } catch (e) { extra.topError = String(e); }
  try {
    const mStart = end.slice(0, 8) + "01";
    const split = await ytReport(tok, { startDate: mStart, endDate: end, metrics: "estimatedRevenue,views", dimensions: "creatorContentType" });
    extra.split = split.map((s: Any) => ({ type: s.creatorContentType, gbp: r2(Number(s.estimatedRevenue || 0)), views: Number(s.views || 0) }));
  } catch (_) { /* not every channel gets this breakdown */ }
  const last = rows.filter((r: Any) => Number(r.views) > 0).map((r: Any) => r.day).sort().pop() || null;
  await merge("meta", "earn_yt", { connected: true, error: null, lastDay: last, top: extra.top || [], split: extra.split || [], syncedAt: new Date().toISOString() });
  return rows.length;
}

// ---------- Facebook ----------
async function syncFacebook(days: number) {
  const m = await priv("meta"); if (!m) return null;
  const page = (m.pages || []).find((p: Any) => p.id === m.page) || (m.pages || [])[0]; if (!page) return null;
  const end = ukDate(); const start = addDays(end, -days);
  const since = Math.floor(Date.parse(start + "T00:00:00Z") / 1000), until = Math.floor(Date.parse(addDays(end, 1) + "T00:00:00Z") / 1000);
  let metric = "content_monetization_earnings"; let j: Any = null;
  for (const mt of ["content_monetization_earnings", "monetization_approximate_earnings"]) {
    j = await (await fetch(`${GRAPH}/${page.id}/insights?metric=${mt}&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(page.token)}`)).json();
    metric = mt; if (!j.error) break;
  }
  if (j.error) throw new Error("Facebook: " + (j.error.message || "insights failed"));
  const values = (j.data && j.data[0] && j.data[0].values) || [];
  const rate = await usdToGbpRates(start, end);
  let sample: Any = null;
  for (const v of values) {
    const day = new Date(Date.parse(v.end_time) - 864e5).toISOString().slice(0, 10); // Meta stamps each day at its end
    const mm = money(v.value); if (sample == null) sample = v.value;
    const cur = (mm.cur || "USD").toUpperCase();
    const fx = cur === "GBP" ? 1 : rate(day);
    await merge("earnings", day, { fb: { amt: r2(mm.amt), cur, rate: cur === "GBP" ? 1 : Math.round(fx * 10000) / 10000, gbp: r2(mm.amt * fx) } });
  }
  // top earning posts (lifetime), last 25 posts
  const extra: Any = {};
  try {
    const pj = await (await fetch(`${GRAPH}/${page.id}/posts?fields=id,message,permalink_url,created_time,insights.metric(${metric}).period(lifetime)&limit=25&access_token=${encodeURIComponent(page.token)}`)).json();
    if (!pj.error) {
      const fxNow = rate(end);
      extra.top = (pj.data || []).map((p: Any) => { const iv = p.insights && p.insights.data && p.insights.data[0] && p.insights.data[0].values && p.insights.data[0].values[0]; const mm = money(iv && iv.value); const cur = (mm.cur || "USD").toUpperCase();
        return { id: p.id, title: String(p.message || "(no text)").split("\n")[0].slice(0, 90), url: p.permalink_url, amt: r2(mm.amt), cur, gbp: r2(mm.amt * (cur === "GBP" ? 1 : fxNow)), at: p.created_time }; })
        .filter((x: Any) => x.amt > 0).sort((a: Any, b: Any) => b.gbp - a.gbp).slice(0, 10);
    }
  } catch (_) { /* optional */ }
  await merge("meta", "earn_fb", { connected: true, page: page.name, pageId: page.id, error: null, metric, sample: JSON.stringify(sample).slice(0, 200), top: extra.top || [], rateToday: Math.round(rate(end) * 10000) / 10000, syncedAt: new Date().toISOString() });
  return values.length;
}

async function syncAll(days = 40) {
  const out: Any = {};
  try { out.yt = await syncYouTube(days); } catch (e: Any) { out.ytError = String(e.message || e); await merge("meta", "earn_yt", { error: out.ytError, syncedAt: new Date().toISOString() }); }
  try { out.fb = await syncFacebook(days); } catch (e: Any) { out.fbError = String(e.message || e); await merge("meta", "earn_fb", { error: out.fbError, syncedAt: new Date().toISOString() }); }
  await merge("meta", "earnings", { syncedAt: new Date().toISOString() });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url);
  // coming back from Google / Facebook sign-in
  if (req.method === "GET" && u.searchParams.get("state")) {
    let back = "", result = "error", why = "";
    try { const r: Any = await finishAuth(u); back = r.back || ""; result = r.result; why = r.why || ""; if (result === "yt-ok" || result === "fb-ok") await syncAll(90).catch(() => {}); }
    catch (e) { why = String(e); }
    const to = (back || "https://github.com").split("#")[0] + "#earnings?c=" + encodeURIComponent(result) + (why ? "&why=" + encodeURIComponent(why.slice(0, 160)) : "");
    return new Response(null, { status: 302, headers: { Location: to } });
  }
  const body = await req.json().catch(() => ({}));
  const isCron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!isCron) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: usr } = await sb.auth.getUser(token);
    if (!usr || !usr.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);
  }
  try {
    if (body.action === "start") return json({ url: await startAuth(body.provider === "google" ? "google" : "meta", String(body.back || "")) });
    if (body.action === "sync") return json(await syncAll(Math.min(400, Number(body.days) || 40)));
    if (body.action === "page") {
      const m = await priv("meta"); if (!m) return json({ code: "not_set_up", message: "Connect Facebook first." }, 400);
      const p = (m.pages || []).find((x: Any) => x.id === String(body.id)); if (!p) return json({ code: "not_found", message: "Page not found." }, 404);
      await privSet("meta", { ...m, page: p.id });
      // clear the old page's figures so the chart shows only this page
      const { data } = await sb.from("docs").select("id,data").eq("collection", "earnings");
      for (const r of data || []) if (r.data && r.data.fb) { const d = { ...r.data }; delete d.fb; await sb.from("docs").upsert({ collection: "earnings", id: r.id, data: d }, { onConflict: "collection,id" }); }
      await merge("meta", "earn_fb", { page: p.name, pageId: p.id, top: [] });
      return json(await syncAll(90));
    }
    if (body.action === "disconnect") {
      const which = body.provider === "google" ? "google" : "meta";
      await privDel(which);
      await merge("meta", which === "google" ? "earn_yt" : "earn_fb", { connected: false });
      return json({ ok: true });
    }
    return json({ code: "bad_request", message: "Unknown action" }, 400);
  } catch (e: Any) {
    return json({ code: "error", message: String((e && e.message) || e).slice(0, 300) }, 200);
  }
});
