// OpusClip: turn a YouTube link into clips, rank them with Claude, plan when to post each one,
// and schedule them to your connected accounts. Your OpusClip key stays here, never in the app.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const API = "https://api.opus.pro/api";
// deno-lint-ignore no-explicit-any
type Any = any;
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;
const later = (p: Promise<unknown>) => { if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(p); else return p; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- db helpers ----------
async function get(c: string, id: string) { const { data } = await sb.from("docs").select("data").eq("collection", c).eq("id", id).maybeSingle(); return data ? data.data : null; }
async function set(c: string, id: string, data: Any) { await sb.from("docs").upsert({ collection: c, id, data }, { onConflict: "collection,id" }); }
async function merge(c: string, id: string, patch: Any) { await sb.rpc("doc_merge", { p_collection: c, p_id: id, p_patch: patch }); }
async function del(c: string, id: string) { await sb.from("docs").delete().eq("collection", c).eq("id", id); }
async function list(c: string, status?: string[]): Promise<Record<string, Any>> {
  const out: Record<string, Any> = {};
  for (let from = 0; ; from += 1000) {
    let q = sb.from("docs").select("id,data").eq("collection", c);
    if (status) q = q.in("data->>status", status);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    for (const r of data) out[r.id] = r.data;
    if (data.length < 1000) break;
  }
  return out;
}

// ---------- UK time ----------
const ukDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
function ukAt(dateStr: string, hhmm: string) {
  const guess = new Date(`${dateStr}T${hhmm}:00Z`);
  const off = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/London" })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - off);
}
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- OpusClip API ----------
async function opus(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${env("OPUS_KEY")}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text();
  let j: Any = null; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
  if (!r.ok) {
    const msg = (j && (j.message || j.error || (j.error && j.error.message))) || t.slice(0, 200);
    const e: Any = new Error(r.status === 401 ? "OpusClip didn't accept the API key. Check the OPUSCLIP_KEY secret." : r.status === 403 ? "OpusClip said no (403): usually the monthly API allowance is used up, or your plan doesn't include the API. " + String(msg).slice(0, 160) : r.status === 429 ? "OpusClip is busy (too many at once). Try again in a minute." : `OpusClip error ${r.status}: ${String(msg).slice(0, 200)}`);
    e.status = r.status; throw e;
  }
  return j;
}
const arr = (j: Any) => Array.isArray(j) ? j : (j && (Array.isArray(j.data) ? j.data : Array.isArray(j.list) ? j.list : Array.isArray(j.items) ? j.items : Array.isArray(j.clips) ? j.clips : (j.data && Array.isArray(j.data.list) ? j.data.list : []))) || [];
async function fetchClips(pid: string) {
  const all: Any[] = [];
  for (let page = 1; page <= 5; page++) {
    const j = await opus(`/exportable-clips?q=findByProjectId&projectId=${encodeURIComponent(pid)}&pageNum=${page}&pageSize=50`);
    const a = arr(j); all.push(...a);
    if (a.length < 50) break;
  }
  return all;
}
function opusScore(c: Any) {
  const v = c.score ?? c.viralityScore ?? c.virality_score ?? (c.curationInfo && c.curationInfo.score) ?? (c.viralityInfo && c.viralityInfo.score) ?? null;
  if (v == null || isNaN(Number(v))) return null;
  const n = Number(v); return Math.round(n <= 1 ? n * 100 : n <= 10 ? n * 10 : n);
}
const bare = (id: string) => String(id).includes(".") ? String(id).split(".").pop()! : String(id);

// ---------- Claude ranking ----------
const PRICES: Record<string, [number, number]> = { "claude-sonnet-5": [2, 10], "claude-haiku-4-5": [1, 5], "claude-haiku-4-5-20251001": [1, 5], "claude-opus-5-5": [4, 20] };
const CAPTION_RULES = `caption: the Facebook caption for this clip. Hook line under 125 characters, 1-2 short lines of context, ONE clear easy-to-answer question, then EXACTLY 3 hashtags on the last line (one club/player tag like #LFC #ManUtd #Arsenal, one broad or competition tag like #PremierLeague or #Football, one type tag like #FootballDebate or #FootballNews). Max 2 emojis. NEVER engagement bait ("like if", "share if", "tag a mate", "type YES"). Only attribute to a pundit or player words they actually say in the transcript.`;
async function claudeSpentOk() {
  const u = await get("meta", "usage"); const month = ukDate().slice(0, 7);
  const gbp = u && u.month === month ? Number(u.usd || 0) * Number(env("USD_TO_GBP") || 0.78) : 0;
  return gbp < Number(env("MONTHLY_BUDGET_GBP") || 10);
}
async function rankWithClaude(project: Any, clips: [string, Any][]) {
  if (!env("ANTHROPIC_API_KEY") || !(await claudeSpentOk())) return null;
  const model = env("CLAUDE_MODEL") || "claude-sonnet-5";
  const matches = Object.values(await list("matches")) as Any[];
  const soon = matches.filter((m) => ["TIMED", "SCHEDULED"].includes(m.status) && Date.parse(m.utcDate) < Date.now() + 7 * 864e5 && Date.parse(m.utcDate) > Date.now())
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate)).slice(0, 25).map((m) => `${ukDate(new Date(m.utcDate))}: ${m.home.short} v ${m.away.short} (${m.compName || m.comp})`);
  const br = Object.values(await list("breaking")).sort((a: Any, b: Any) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8).map((b: Any) => "- " + b.headline);
  const items = clips.map(([, c], i) => ({ n: i + 1, opusTitle: c.title, seconds: Math.round(c.secs), opusScore: c.opusScore, transcript: String(c.text || c.desc || "").slice(0, 900) }));
  const prompt = `Today is ${ukDate()} (UK). Pundit Bible is a UK football page (Facebook, Instagram, TikTok, YouTube Shorts) that posts short clips of football pundits and podcasts.
Source video: "${project.title || project.url}".

Big fixtures in the next 7 days:
${soon.join("\n") || "(none known)"}

Current football news headlines:
${br.join("\n") || "(none)"}

These are the ${items.length} clips OpusClip cut from the video:
${JSON.stringify(items)}

Score every clip 0-100 for how many views it is likely to get as a short on Pundit Bible. What gets views: a strong, clear opinion or hot take in the first 3 seconds; controversy fans will argue about; the biggest clubs and players (Man Utd, Liverpool, Arsenal, Man City, Chelsea, Spurs, England, Ronaldo, Messi, Haaland, Salah etc.); banter and funny moments; stories that are in the news this week or tied to an upcoming big game; a clip that makes sense on its own without the rest of the video; 20-60 seconds long (over 90 seconds scores lower). Low scores: rambling, no clear point, needs context from earlier in the video, ads/sponsor reads, intros and outros, small talk. If two clips cover the same moment, give the weaker one post:false.

Reply with only JSON: {"clips":[{"n":1,"score":82,"post":true,"reason":"why it will or won't travel, max 15 words","hook":"punchy title for YouTube/TikTok, max 70 characters, no emoji, no fake quotes","caption":"...","people":["names of players/pundits/managers mentioned"],"date":"YYYY-MM-DD if it's best posted on a particular day (e.g. the day before a related big game), else null"}]}
${CAPTION_RULES}
UK English.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 8000, system: "You are the social media editor for Pundit Bible, a UK football page. UK English. Honest predictions, not hype.", messages: [{ role: "user", content: prompt }] }),
  });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) { console.log("claude rank failed", r.status, JSON.stringify(out).slice(0, 300)); return null; }
  const u = out.usage || {}; const p = PRICES[model] || [2, 10];
  await sb.rpc("add_usage", { p_usd: Number((((u.input_tokens || 0) * p[0] + (u.output_tokens || 0) * p[1]) / 1e6).toFixed(5)), p_doc: "usage" });
  const text = (out.content || []).filter((b: Any) => b.type === "text").map((b: Any) => b.text).join("");
  try { const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); return Array.isArray(j.clips) ? j.clips : null; } catch { return null; }
}

// ---------- bring a finished project's clips in ----------
async function finishProject(pid: string, opts: { force?: boolean } = {}) {
  const project = await get("opus", pid);
  if (!project) return { status: "unknown" };
  if (!opts.force && project.status === "ranking" && Date.now() - Date.parse(project.rankingAt || 0) < 4 * 60000) return { status: "ranking" };
  if (!opts.force && project.status === "ready") return { status: "ready" };
  await merge("opus", pid, { lastPoll: new Date().toISOString() });
  let raw: Any[];
  try { raw = await fetchClips(pid); } catch (e: Any) { await merge("opus", pid, { lastError: String(e.message || e).slice(0, 300) }); return { status: project.status, message: String(e.message || e) }; }
  if (!raw.length) {
    if (Date.now() - Date.parse(project.at) > 8 * 3600e3) { await merge("opus", pid, { status: "failed", error: "No clips came back after 8 hours. Check the project in OpusClip." }); return { status: "failed" }; }
    return { status: "processing" };
  }
  await merge("opus", pid, { status: "ranking", rankingAt: new Date().toISOString(), count: raw.length, lastError: null });
  // save the clips (keep anything you've already done to them)
  const have = await list("clips");
  const saved: [string, Any][] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]; const cid = bare(c.id || c.clipId || c.curationId || String(i));
    const id = `${pid}.${cid}`; const prev = have[id] || {};
    const doc = { status: "new", ...prev, project: pid, clipId: cid, n: i + 1, title: c.title || prev.title || "", desc: c.description || "", tags: c.hashtags || "", secs: Number(c.durationMs || 0) / 1000,
      preview: c.uriForPreview || c.uriForExport || "", export: c.uriForExport || c.uriForPreview || "", text: String(c.text || c.transcript || "").slice(0, 2000), opusScore: opusScore(c), made: c.createdAt || new Date().toISOString() };
    await set("clips", id, doc); saved.push([id, doc]);
  }
  // rank with Claude (falls back to OpusClip's own order if Claude isn't available)
  const ranked = await rankWithClaude(project, saved).catch((e) => { console.log("rank", String(e)); return null; });
  let top = "", topScore = -1;
  for (let i = 0; i < saved.length; i++) {
    const [id, c] = saved[i]; const r = ranked && ranked.find((x: Any) => Number(x.n) === i + 1);
    const patch: Any = r ? { score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))), post: r.post !== false, reason: String(r.reason || ""), hook: String(r.hook || c.title || "").slice(0, 90), caption: String(r.caption || ""), people: Array.isArray(r.people) ? r.people.slice(0, 6) : [], date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : null, ranked: "claude" }
      : { score: c.opusScore ?? Math.max(20, 80 - i * 3), post: true, reason: c.opusScore != null ? "OpusClip's virality score" : "OpusClip's order (Claude wasn't available)", hook: c.title, caption: [c.title, c.desc, c.tags].filter(Boolean).join("\n\n"), people: [], date: null, ranked: "opus" };
    if (c.score != null && c.ranked === "claude" && !opts.force) continue; // already ranked earlier
    await merge("clips", id, patch);
    if (patch.post && patch.score > topScore) { topScore = patch.score; top = id; }
  }
  await merge("opus", pid, { status: "ready", readyAt: new Date().toISOString(), top, ranked: ranked ? "claude" : "opus" });
  const planned = await plan();
  const n = saved.length;
  await push(`🎬 ${n} clips ready`, `${project.title || "Your video"}: ranked and ${planned} added to your posting plan.`, `./#clipset/${pid}`, "opus-" + pid);
  return { status: "ready", count: n };
}

// ---------- the posting plan ----------
const DEF_TIMES = ["12:00", "17:30", "20:30"];
async function plan() {
  const settings = (await get("meta", "settings")) || {};
  const times: string[] = (Array.isArray(settings.clipTimes) && settings.clipTimes.length ? settings.clipTimes : DEF_TIMES).slice().sort();
  const days = Math.max(1, Math.min(14, Number(settings.clipDays) || 7));
  const clips = await list("clips");
  const projects = await list("opus");
  const now = Date.now(); const earliest = now + 20 * 60000;
  const key = (t: number) => new Date(Math.round(t / 60000) * 60000).toISOString();
  const taken = new Set<string>();
  for (const c of Object.values(clips)) if (c.plan && c.plan.at && (c.plan.locked || ["scheduled", "sent", "posted"].includes(c.status) || (c.status === "planned" && Date.parse(c.plan.at) <= now))) taken.add(key(Date.parse(c.plan.at)));
  // free slots, grouped by UK day
  const today = ukDate(); const byDay: { day: string; slots: number[] }[] = [];
  for (let d = 0; d < days; d++) {
    const day = addDays(today, d);
    const slots = times.map((t) => ukAt(day, t).getTime()).filter((t) => t >= earliest && !taken.has(key(t)));
    if (slots.length) byDay.push({ day, slots });
  }
  const ageDays = (c: Any) => { const p = projects[c.project]; return (now - Date.parse((p && p.at) || c.made || now)) / 864e5; };
  const pool = Object.entries(clips).filter(([, c]) => ["new", "planned"].includes(c.status || "new") && !c.skip && c.post !== false && !(c.plan && c.plan.locked) && !(c.status === "planned" && c.plan && Date.parse(c.plan.at) <= now) && c.score != null && ageDays(c) < 7)
    .map(([id, c]) => ({ id, c, eff: Number(c.score) * Math.max(0.35, 1 - 0.12 * ageDays(c)) }))
    .sort((a, b) => b.eff - a.eff);
  const assign = new Map<string, number>();
  // 1) clips tied to a day (e.g. the day before a big game): best free slot that day
  for (const x of pool) {
    if (!x.c.date) continue; const d = byDay.find((b) => b.day === x.c.date);
    if (d && d.slots.length) { const t = d.slots.pop()!; assign.set(x.id, t); }
  }
  // 2) the rest, best first; within each day the strongest clip gets the evening slot
  const rest = pool.filter((x) => !assign.has(x.id));
  let i = 0;
  for (const d of byDay) {
    const n = d.slots.length; const pick = rest.slice(i, i + n); i += n;
    const slotsEveningFirst = d.slots.slice().sort((a, b) => b - a);
    pick.forEach((x, k) => assign.set(x.id, slotsEveningFirst[k]));
  }
  let planned = 0;
  for (const x of pool) {
    const t = assign.get(x.id);
    const next = t ? { status: "planned", plan: { at: new Date(t).toISOString(), locked: false, reminded: false } } : { status: "new", plan: null };
    if (t) planned++;
    const cur = x.c.plan && x.c.plan.at;
    if ((cur || null) !== (next.plan ? next.plan.at : null) || x.c.status !== next.status) await merge("clips", x.id, next);
  }
  await merge("meta", "clipplan", { at: new Date().toISOString(), planned, reserve: pool.length - planned });
  return planned;
}

// ---------- push (via the tick function's keys) ----------
async function push(title: string, body: string, url: string, tag: string) {
  try {
    await fetch(`${env("SUPABASE_URL")}/functions/v1/tick`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": env("CRON_SECRET") }, body: JSON.stringify({ action: "push", title, body, url, tag }) });
  } catch (e) { console.log("push", String(e)); }
}

// ---------- every minute (from tick): finish projects, reminders, tidy up ----------
async function poll() {
  const log: string[] = []; const now = Date.now();
  const projects = await list("opus", ["processing", "ranking"]);
  for (const [pid, p] of Object.entries(projects)) {
    if (p.status === "ranking" && now - Date.parse(p.rankingAt || 0) < 4 * 60000) continue;
    if (now - Date.parse(p.at) < 3 * 60000 || now - Date.parse(p.lastPoll || 0) < 2 * 60000) continue;
    const r = await finishProject(pid); log.push(`${pid}: ${r.status}`);
  }
  const settings = (await get("meta", "settings")) || {};
  const remind = !settings.alerts || settings.alerts.reminders !== false;
  const due = await list("clips", ["planned", "scheduled"]);
  for (const [id, c] of Object.entries(due)) {
    const t = Date.parse((c.plan && c.plan.at) || "");
    if (!t || t > now) continue;
    if (c.status === "scheduled") { await merge("clips", id, { status: "sent" }); continue; }
    if (!c.plan.reminded && t > now - 15 * 60000 && remind) {
      await push("🎬 Time to post a clip", c.hook || c.title || "A clip is due", `./#clip/${id}`, "clip-" + id);
      await merge("clips", id, { plan: { ...c.plan, reminded: true } }); log.push("reminder " + id);
    } else if (t < now - 6 * 3600e3) await merge("clips", id, { status: "missed" }); // you can plan it again from the Clips page
  }
  // tidy: OpusClip keeps clips for 30 days
  const st = (await get("meta", "clipplan")) || {};
  if (now - Date.parse(st.cleaned || 0) > 24 * 3600e3) {
    const all = await list("clips");
    for (const [id, c] of Object.entries(all)) if (now - Date.parse(c.made || 0) > 30 * 864e5) await del("clips", id);
    const ps = await list("opus");
    for (const [id, p] of Object.entries(ps)) if (now - Date.parse(p.at || 0) > 30 * 864e5) await del("opus", id);
    await merge("meta", "clipplan", { cleaned: new Date().toISOString() });
    await plan(); // once a day: keep the next week filled from your best clips in reserve
  }
  return log;
}

async function ytTitle(url: string) {
  try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`); if (r.ok) { const j = await r.json(); return String(j.title || ""); } } catch (_) { /* no title */ }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url);
  const raw = await req.text();
  let body: Any = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  // OpusClip calls this when a project finishes. We only act on projects we started, and we fetch the clips
  // from OpusClip ourselves, so a fake call can't do anything except make us check early.
  if (u.searchParams.get("hook")) {
    const pid = String(body.projectId || (body.data && (body.data.projectId || body.data.id)) || body.id || u.searchParams.get("p") || "");
    if (pid && (await get("opus", pid))) later(finishProject(pid).catch((e) => console.log("hook", String(e))));
    return json({ ok: true });
  }

  const isCron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!isCron) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: usr } = await sb.auth.getUser(token);
    if (!usr || !usr.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);
  }
  if (!env("OPUS_KEY")) return json({ code: "not_set_up", message: "OpusClip isn't connected yet (setup guide, step 9)." }, 400);

  try {
    if (body.action === "poll") return json({ ok: true, log: await poll() });

    if (body.action === "create") {
      const url = String(body.url || "").trim();
      if (!/^https?:\/\//.test(url)) return json({ code: "bad_request", message: "Paste a full link, e.g. https://www.youtube.com/watch?v=…" }, 400);
      const title = String(body.title || "").trim() || (await ytTitle(url)) || "Video";
      const len: Record<string, number[][]> = { short: [[0, 30]], mid: [[30, 60]], long: [[60, 90]], mix: [[0, 30], [30, 60], [60, 90]] };
      const curationPref: Any = { model: body.prompt ? "ClipAnything" : "ClipBasic", genre: "Auto" };
      if (len[body.length]) curationPref.clipDurations = len[body.length];
      if (body.prompt) curationPref.customPrompt = String(body.prompt).slice(0, 500);
      const req2: Any = { videoUrl: url, uploadedVideoAttr: { title }, curationPref, renderPref: { layoutAspectRatio: "portrait" },
        conclusionActions: [{ type: "WEBHOOK", notifyFailure: true, url: `${env("SUPABASE_URL")}/functions/v1/opus?hook=1` }] };
      const settings = (await get("meta", "settings")) || {};
      if (settings.opusTemplate) req2.brandTemplateId = settings.opusTemplate;
      const j = await opus("/clip-projects", { method: "POST", body: JSON.stringify(req2) });
      const pid = String(j.id || j.projectId || (j.data && (j.data.id || j.data.projectId)) || "");
      if (!pid) return json({ code: "error", message: "OpusClip started it but didn't return a project ID: " + JSON.stringify(j).slice(0, 200) }, 502);
      await set("opus", pid, { url, title, status: "processing", at: new Date().toISOString(), length: body.length || "auto", prompt: body.prompt || "" });
      return json({ id: pid, title });
    }

    if (body.action === "import") {
      const m = String(body.link || "").match(/\b(P[0-9A-Za-z]{6,})\b/);
      if (!m) return json({ code: "bad_request", message: "That doesn't look like an OpusClip project link (it should contain an ID starting with P)." }, 400);
      const pid = m[1];
      if (!(await get("opus", pid))) await set("opus", pid, { url: String(body.link), title: String(body.title || "").trim() || "Imported from OpusClip", status: "processing", at: new Date().toISOString(), imported: true });
      const r = await finishProject(pid, { force: true });
      return json({ id: pid, ...r });
    }

    if (body.action === "check") { return json(await finishProject(String(body.id), { force: !!body.rerank })); }
    if (body.action === "plan") { return json({ planned: await plan() }); }

    if (body.action === "accounts") {
      const j = await opus("/social-accounts?q=mine");
      const accounts = arr(j).map((a: Any) => ({ postAccountId: a.postAccountId, subAccountId: a.subAccountId || null, platform: a.platform, name: a.extUserName || a.platform, pic: a.extUserPictureLink || "" }));
      await set("meta", "opusAccounts", { at: new Date().toISOString(), accounts });
      return json({ accounts });
    }

    if (body.action === "templates") {
      const j = await opus("/brand-templates"); return json({ templates: arr(j).map((t: Any) => ({ id: t.id || t.templateId, name: t.name || t.title || t.id })) });
    }

    // schedule (or post right now) one clip to one or more accounts
    if (body.action === "schedule") {
      const id = String(body.clip); const c = await get("clips", id);
      if (!c) return json({ code: "not_found", message: "Clip not found." }, 404);
      const at = body.at ? new Date(body.at) : null;
      if (at && at.getTime() < Date.now() + 5 * 60000) return json({ code: "bad_request", message: "Pick a time at least 5 minutes from now, or use Post now." }, 400);
      const results: Any[] = []; const sched = Array.isArray(c.sched) ? c.sched.filter((s: Any) => s.state !== "cancelled") : [];
      for (const t of (body.targets || []).slice(0, 8)) {
        const payload: Any = { projectId: c.project, clipId: c.clipId, postAccountId: t.postAccountId, postDetail: { title: String(t.title || c.hook || c.title || "Pundit Bible").slice(0, 100), custom: { description: String(t.description || "").slice(0, 2200) } } };
        if (t.subAccountId) payload.subAccountId = t.subAccountId;
        if (t.platform === "YOUTUBE") payload.postDetail.custom.privacy = "public";
        try {
          if (at) { const j = await opus("/publish-schedules", { method: "POST", body: JSON.stringify({ ...payload, publishAt: at.toISOString() }) }); const sid = (j.data && j.data.scheduleId) || j.scheduleId; sched.push({ platform: t.platform, name: t.name || "", scheduleId: sid, at: at.toISOString(), state: "scheduled" }); results.push({ platform: t.platform, ok: true }); }
          else { const j = await opus("/post-tasks", { method: "POST", body: JSON.stringify(payload) }); const pid = (j.data && j.data.postId) || j.postId; sched.push({ platform: t.platform, name: t.name || "", postId: pid, at: new Date().toISOString(), state: "posted" }); results.push({ platform: t.platform, ok: true }); }
        } catch (e: Any) { results.push({ platform: t.platform, ok: false, message: String(e.message || e) }); }
        await sleep(1100); // OpusClip allows about one post request a second
      }
      const okN = results.filter((r) => r.ok).length;
      if (okN) await merge("clips", id, { sched, status: at ? "scheduled" : "sent", plan: { at: (at || new Date()).toISOString(), locked: true, reminded: true } });
      return json({ results, ok: okN });
    }

    if (body.action === "cancel") {
      const id = String(body.clip); const c = await get("clips", id); if (!c) return json({ code: "not_found", message: "Clip not found." }, 404);
      const sched = Array.isArray(c.sched) ? c.sched : []; let n = 0; const errs: string[] = [];
      for (const s of sched) if (s.state === "scheduled" && s.scheduleId) {
        try { await opus(`/publish-schedules/${encodeURIComponent(s.scheduleId)}`, { method: "DELETE" }); s.state = "cancelled"; n++; } catch (e: Any) { errs.push(String(e.message || e)); }
      }
      await merge("clips", id, { sched, status: sched.some((s: Any) => s.state === "scheduled") ? "scheduled" : "planned" });
      return json({ cancelled: n, errors: errs });
    }

    // the video file itself (so the phone can save it)
    if (body.action === "file") {
      const c = await get("clips", String(body.clip)); if (!c) return json({ code: "not_found", message: "Clip not found." }, 404);
      let r = c.export ? await fetch(c.export) : null;
      if (!r || !r.ok) {
        const fresh = (await fetchClips(c.project)).find((x: Any) => bare(x.id || "") === c.clipId);
        if (fresh && fresh.uriForExport) { await merge("clips", String(body.clip), { export: fresh.uriForExport, preview: fresh.uriForPreview || fresh.uriForExport }); r = await fetch(fresh.uriForExport); }
      }
      if (!r || !r.ok) return json({ code: "gone", message: "OpusClip no longer has this clip (they keep them for 30 days)." }, 410);
      return new Response(r.body, { headers: { ...cors, "Content-Type": "application/octet-stream" } });
    }

    return json({ code: "bad_request", message: "Unknown action" }, 400);
  } catch (e: Any) {
    return json({ code: "error", message: String((e && e.message) || e).slice(0, 400) }, e && e.status === 403 ? 200 : 500);
  }
});
