// Runs every minute (scheduled by set-up). Does four jobs:
// 1) posting reminders to your phone  2) live scores + goal / half-time / full-time alerts
// 3) keeps fixtures, tables and top scorers fresh  4) drafts automatic match posts.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const FD = "https://api.football-data.org/v4";
const COMPS = ["PL", "ELC", "CL", "WC", "EC"];
const TABLE_COMPS = ["PL", "ELC", "CL"];
const DEFAULT_TEAMS = ["Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United", "Tottenham", "Newcastle", "Aston Villa", "Nottingham Forest", "England"];
// deno-lint-ignore no-explicit-any
type Any = any;

// ---------- tiny db helpers (same "docs" table the app uses) ----------
async function list(c: string): Promise<Record<string, Any>> {
  const out: Record<string, Any> = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("docs").select("id,data").eq("collection", c).range(from, from + 999);
    if (error) throw error;
    for (const r of data) out[r.id] = r.data;
    if (data.length < 1000) break;
  }
  return out;
}
async function get(c: string, id: string) { const { data } = await sb.from("docs").select("data").eq("collection", c).eq("id", id).maybeSingle(); return data ? data.data : null; }
async function set(c: string, id: string, data: Any) { await sb.from("docs").upsert({ collection: c, id, data, updated_at: new Date().toISOString() }, { onConflict: "collection,id" }); }
async function merge(c: string, id: string, patch: Any) { await sb.rpc("doc_merge", { p_collection: c, p_id: id, p_patch: patch }); }
async function del(c: string, id: string) { await sb.from("docs").delete().eq("collection", c).eq("id", id); }

// ---------- UK time helpers ----------
const ukDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
const ukHour = (d = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(d));
const ukLabel = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(d);
const ukTime = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(d);
// a UK wall-clock time on a UK date -> real Date (handles BST/GMT)
function ukAt(dateStr: string, hhmm: string) {
  const guess = new Date(`${dateStr}T${hhmm}:00Z`);
  const off = (new Date(guess.toLocaleString("en-US", { timeZone: "Europe/London" })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime());
  return new Date(guess.getTime() - off);
}
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- push ----------
let pushReady = false;
function initPush() {
  if (pushReady) return true;
  if (!env("VAPID_PUBLIC") || !env("VAPID_PRIVATE")) return false;
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:studio@punditbible.app", env("VAPID_PUBLIC"), env("VAPID_PRIVATE"));
  return (pushReady = true);
}
async function push(title: string, body: string, url: string, tag?: string) {
  if (!initPush()) return 0;
  const subs = await list("push");
  let n = 0;
  await Promise.all(Object.entries(subs).map(async ([id, s]) => {
    try { await webpush.sendNotification(s.sub, JSON.stringify({ title, body, url, tag })); n++; }
    catch (e: Any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await del("push", id); else console.log("push error", e && e.statusCode, e && e.body); }
  }));
  return n;
}

// ---------- football-data.org ----------
let fdCalls = 0;
async function fd(path: string, headers: Record<string, string> = {}) {
  if (fdCalls >= 5) throw new Error("request budget for this minute used");
  fdCalls++;
  const r = await fetch(FD + path, { headers: { "X-Auth-Token": env("FOOTBALL_DATA_KEY"), ...headers } });
  if (r.status === 429) throw new Error("football-data rate limit");
  if (!r.ok) throw new Error(`football-data ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}
const team = (t: Any) => ({ id: t && t.id, name: (t && t.name) || "", short: (t && (t.shortName || t.name)) || "", tla: (t && t.tla) || "", crest: (t && t.crest) || "" });
function slim(m: Any, prev: Any) {
  const ft = (m.score && m.score.fullTime) || {}; const ht = (m.score && m.score.halfTime) || {};
  return {
    ...(prev || {}),
    id: m.id, comp: m.competition && m.competition.code, compName: m.competition && m.competition.name, matchday: m.matchday || null,
    utcDate: m.utcDate, status: m.status, minute: m.minute ?? null, injuryTime: m.injuryTime ?? null,
    home: team(m.homeTeam), away: team(m.awayTeam),
    hs: ft.home ?? (m.status === "SCHEDULED" || m.status === "TIMED" ? null : 0), as: ft.away ?? (m.status === "SCHEDULED" || m.status === "TIMED" ? null : 0),
    hths: ht.home ?? null, htas: ht.away ?? null,
    goals: Array.isArray(m.goals) ? m.goals.map((g: Any) => ({ minute: g.minute, side: g.team && m.homeTeam && g.team.id === m.homeTeam.id ? "home" : "away", scorer: g.scorer && g.scorer.name })) : (prev && prev.goals) || [],
    venue: m.venue || (prev && prev.venue) || "",
  };
}
function watched(m: Any, S: Any) {
  if (!S.comps.includes(m.comp)) return false;
  const names = [m.home.name, m.home.short, m.away.name, m.away.short].join(" | ").toLowerCase();
  return S.teams.some((t: string) => t && names.includes(t.toLowerCase()));
}

// ---------- hashtags for automatic posts ----------
const CLUB: Record<string, string> = { arsenal: "#Arsenal", chelsea: "#Chelsea", liverpool: "#LFC", "man city": "#ManCity", "manchester city": "#ManCity", "man united": "#ManUtd", "manchester united": "#ManUtd", tottenham: "#Spurs", spurs: "#Spurs", newcastle: "#NUFC", "aston villa": "#AVFC", "west ham": "#WHUFC", everton: "#EFC", brighton: "#BHAFC", "nottingham": "#NFFC", "nott'm forest": "#NFFC", leeds: "#LUFC", sunderland: "#SAFC", wolverhampton: "#Wolves", wolves: "#Wolves", "crystal palace": "#CPFC", fulham: "#Fulham", brentford: "#Brentford", bournemouth: "#AFCB", burnley: "#Burnley", england: "#England" };
const clubTag = (n: string) => { const k = n.toLowerCase(); for (const [a, t] of Object.entries(CLUB)) if (k.includes(a)) return t; return "#" + n.replace(/[^A-Za-z0-9]/g, ""); };
const compTag = (c: string) => ({ PL: "#PremierLeague", ELC: "#EFL", CL: "#ChampionsLeague", WC: "#WorldCup", EC: "#Euros" } as Record<string, string>)[c] || "#Football";
const blank = () => ({ ready: false, id: null, zoom: 1, dx: 0, dy: 0 });
async function autoPost(id: string, doc: Any) {
  if (await get("posts", id)) return false;
  const now = new Date();
  await set("posts", id, { order: -Math.round(now.getTime() / 1000), batch: ukDate(), batchLabel: `Automatic · ${ukLabel(now)}`, status: "todo", auto: true, sources: [], photo: blank(), theme: "brand", ...doc });
  return true;
}

// ---------- Claude (only for the ratings draft) ----------
async function claudeRatings(m: Any, side: "home" | "away", report: string) {
  const usage = await get("meta", "usage");
  const month = ukDate().slice(0, 7);
  const spentGbp = usage && usage.month === month ? Number(usage.usd || 0) * Number(env("USD_TO_GBP") || 0.78) : 0;
  if (spentGbp >= Number(env("MONTHLY_BUDGET_GBP") || 10) * 0.85) return null;
  const t = side === "home" ? m.home.short : m.away.short;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, system: "You write Pundit Bible player ratings. UK English. Use ONLY player names that appear in the match report. Ratings are Pundit Bible's opinion based on the report.",
      messages: [{ role: "user", content: `Match: ${m.home.short} ${m.hs}-${m.as} ${m.away.short}.\nMatch report:\n${report.slice(0, 7000)}\n\nRate up to 11 ${t} players who are named in the report, out of 10 (whole numbers, 3-10), best performer highest. Reply with only JSON: {"rows":[{"name":"Surname","score":"8"}],"motm":"Surname"}` }] }),
  });
  const out = await r.json();
  if (!r.ok) return null;
  const u = out.usage || {};
  await sb.rpc("add_usage", { p_usd: ((u.input_tokens || 0) * 1 + (u.output_tokens || 0) * 5) / 1e6, p_doc: "usage" });
  const text = (out.content || []).map((b: Any) => b.text || "").join("");
  try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { return null; }
}
async function findReport(m: Any) {
  try {
    const x = await (await fetch("https://feeds.bbci.co.uk/sport/football/rss.xml", { headers: { "User-Agent": "Mozilla/5.0 PunditBibleStudio" } })).text();
    const a = m.home.short.toLowerCase().split(" ")[0], b = m.away.short.toLowerCase().split(" ")[0];
    for (const it of x.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
      const title = (it[0].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || "";
      const link = ((it[0].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "").split("?")[0];
      const desc = (it[0].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || "";
      const hay = (title + " " + desc).toLowerCase();
      if (link && hay.includes(a) && hay.includes(b)) {
        const h = await (await fetch(link, { headers: { "User-Agent": "Mozilla/5.0 PunditBibleStudio" } })).text();
        const text = [...h.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)].map((p) => p[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter((t) => t.length > 40).join("\n");
        if (text.length > 400) return { text, link };
      }
    }
  } catch (e) { console.log("report", String(e)); }
  return null;
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const isCron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!isCron) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(token);
    if (!u || !u.user) return json({ message: "Not allowed" }, 401);
    if (body.action === "test") { const n = await push("Pundit Bible Studio", "Alerts are working ✅", "./#home", "test"); return json({ sent: n, ready: initPush() }); }
    return json({ message: "Unknown action" }, 400);
  }

  fdCalls = 0;
  const now = new Date(); const log: string[] = [];
  const settings = (await get("meta", "settings")) || {};
  const S = {
    teams: Array.isArray(settings.watchTeams) && settings.watchTeams.length ? settings.watchTeams : DEFAULT_TEAMS,
    comps: Array.isArray(settings.alertComps) && settings.alertComps.length ? settings.alertComps : ["PL", "CL", "WC", "EC"],
    alerts: { goals: true, ht: true, ft: true, reminders: true, ...(settings.alerts || {}) },
    auto: { pred: true, res: true, rat: true, ...(settings.auto || {}) },
    slots: Array.isArray(settings.slots) && settings.slots.length ? settings.slots : ["08:00", "12:30", "18:00", "20:30"],
  };
  const state = (await get("meta", "football")) || {};

  // 1) posting reminders
  try {
    if (S.alerts.reminders) {
      const posts = await list("posts");
      for (const [id, p] of Object.entries(posts)) {
        const t = Date.parse(p.slot || "");
        if (!t || p.status === "posted" || p.reminded) continue;
        if (t <= now.getTime() && t > now.getTime() - 15 * 60000) {
          await push("Time to post 📲", p.title || "A post is due", `./#post/${id}`, "post-" + id);
          await merge("posts", id, { reminded: true });
          log.push("reminder " + id);
        }
      }
    }
  } catch (e) { log.push("reminders failed: " + e); }

  // 2-4) football
  if (env("FOOTBALL_DATA_KEY")) {
    try {
      const matches = await list("matches");
      const all = Object.values(matches);
      // live polling: anything in play, or due to kick off
      const live = all.filter((m: Any) => ["IN_PLAY", "PAUSED"].includes(m.status) || (["TIMED", "SCHEDULED"].includes(m.status) && Date.parse(m.utcDate) <= now.getTime() + 60000 && Date.parse(m.utcDate) >= now.getTime() - 3 * 3600e3));
      if (live.length) {
        const ids = live.map((m: Any) => m.id).slice(0, 30).join(",");
        const res = await fd(`/matches?ids=${ids}`, { "X-Unfold-Goals": "true" });
        for (const am of res.matches || []) {
          const prev = matches[String(am.id)] || {}; const m = slim(am, prev);
          const w = watched(m, S);
          const up = (m.hs ?? 0) + (m.as ?? 0) > (prev.hs ?? 0) + (prev.as ?? 0);
          if (up && m.status !== "FINISHED") {
            const side = (m.hs ?? 0) > (prev.hs ?? 0) ? "home" : "away";
            const g = [...(m.goals || [])].reverse().find((x: Any) => x.side === side);
            m.lastGoal = { side, minute: m.minute || (g && g.minute) || "", scorer: (g && g.scorer) || "", at: now.toISOString() };
            if (w && S.alerts.goals) await push(`⚽ GOAL! ${side === "home" ? m.home.short : m.away.short}${m.lastGoal.minute ? " " + m.lastGoal.minute + "'" : ""}`, `${m.home.short} ${m.hs}-${m.as} ${m.away.short}${m.lastGoal.scorer ? " · " + m.lastGoal.scorer : ""}. Tap for the GOAL card.`, `./#goal/${m.id}`, "goal-" + m.id);
          }
          if (prev.status === "IN_PLAY" && m.status === "PAUSED" && w && S.alerts.ht) await push(`Half-time: ${m.home.short} ${m.hs}-${m.as} ${m.away.short}`, "Tap for the half-time card.", `./#ht/${m.id}`, "ht-" + m.id);
          if (prev.status !== "FINISHED" && m.status === "FINISHED") {
            m.ftAt = now.toISOString(); state.tablesStale = { ...(state.tablesStale || {}), [m.comp]: true };
            if (w && S.alerts.ft) await push(`Full time: ${m.home.short} ${m.hs}-${m.as} ${m.away.short}`, "Tap for the full-time card.", `./#ft/${m.id}`, "ft-" + m.id);
            if (w && S.auto.res) {
              const sc = (side: string) => (m.goals || []).filter((g: Any) => g.side === side && g.scorer).map((g: Any) => `${g.scorer} ${g.minute}'`);
              await autoPost(`auto-ft-${m.id}`, { when: "Post now", slot: now.toISOString(), format: "Full-time result", title: `FT: ${m.home.short} ${m.hs}-${m.as} ${m.away.short}`, why: "Fast score cards get shared on match day.", template: "result",
                fields: { tag: (m.compName || "FULL TIME").toUpperCase(), label: "FULL TIME", home: m.home.short, away: m.away.short, hs: m.hs, as: m.as, homeScorers: sc("home"), awayScorers: sc("away"), question: "Who was your man of the match?" },
                caption: `FT: ${m.home.short} ${m.hs}-${m.as} ${m.away.short}\n\nWho was your man of the match? 👇\n\n${clubTag(m.hs >= m.as ? m.home.name : m.away.name)} ${compTag(m.comp)} #MatchDay`,
                photoSearch: { term: `${m.hs >= m.as ? m.home.short : m.away.short} players celebrate`, tip: "Optional: the card works without a photo." } });
            }
          }
          if (JSON.stringify(m) !== JSON.stringify(prev)) { await set("matches", String(m.id), m); matches[String(m.id)] = m; }
        }
        log.push(`live: ${live.length}`);
      }

      // fixtures and results: every 30 min (every 10 min on match days)
      const today = ukDate();
      const matchDay = all.some((m: Any) => (m.utcDate || "").slice(0, 10) === today.slice(0, 10));
      if (now.getTime() - (state.lastFixtures || 0) > (matchDay ? 10 : 30) * 60000 && fdCalls <= 2) {
        const ranges = [[addDays(today, -3), addDays(today, 6)], [addDays(today, 6), addDays(today, 15)]];
        let n = 0;
        for (const [a, b] of ranges) {
          const res = await fd(`/matches?competitions=${COMPS.join(",")}&dateFrom=${a}&dateTo=${b}`);
          for (const am of res.matches || []) {
            const prev = matches[String(am.id)]; if (prev && ["IN_PLAY", "PAUSED"].includes(prev.status)) continue;
            const m = slim(am, prev);
            if (!prev || JSON.stringify(m) !== JSON.stringify(prev)) { await set("matches", String(m.id), m); matches[String(m.id)] = m; n++; }
          }
        }
        for (const [id, m] of Object.entries(matches)) if (Date.parse(m.utcDate) < now.getTime() - 10 * 864e5) await del("matches", id);
        state.lastFixtures = now.getTime(); log.push(`fixtures updated: ${n}`);
      }

      // tables and top scorers: one competition per minute, every 6 hours or after a full-time
      if (fdCalls <= 3) {
        const due = TABLE_COMPS.find((c) => (state.tablesStale && state.tablesStale[c]) || now.getTime() - ((state.lastTables || {})[c] || 0) > 6 * 3600e3);
        if (due) {
          const st = await fd(`/competitions/${due}/standings`);
          const total = (st.standings || []).filter((s: Any) => s.type === "TOTAL");
          const rows = (x: Any) => (x.table || []).map((r: Any) => ({ position: r.position, team: team(r.team), playedGames: r.playedGames, won: r.won, draw: r.draw, lost: r.lost, points: r.points, goalDifference: r.goalDifference, form: r.form }));
          await set("tables", due, { comp: due, updatedAt: now.toISOString(), matchday: st.season && st.season.currentMatchday, groups: total.map((g: Any) => ({ group: g.group, table: rows(g) })) });
          const sc = await fd(`/competitions/${due}/scorers?limit=15`);
          await set("scorers", due, { comp: due, updatedAt: now.toISOString(), scorers: (sc.scorers || []).map((s: Any) => ({ name: s.player && s.player.name, team: team(s.team), goals: s.goals, assists: s.assists, penalties: s.penalties })) });
          state.lastTables = { ...(state.lastTables || {}), [due]: now.getTime() }; if (state.tablesStale) delete state.tablesStale[due];
          log.push("table " + due);
        }
      }

      // automatic "predict the score" posts, once a day from 10am, for tomorrow's watched games
      if (S.auto.pred && ukHour(now) >= 10 && state.predDate !== today) {
        const tomorrow = addDays(today, 1);
        const slot = ukAt(today, S.slots.find((t: string) => t >= "12:00") || "18:00");
        for (const m of Object.values(matches) as Any[]) {
          if (!["TIMED", "SCHEDULED"].includes(m.status) || ukDate(new Date(m.utcDate)) !== tomorrow || !watched(m, S)) continue;
          const ko = new Date(m.utcDate);
          await autoPost(`auto-pred-${m.id}`, { when: `${ukLabel(slot)} · ${ukTime(slot)}`, slot: slot.toISOString(), format: "Predictor", title: `Predict: ${m.home.short} v ${m.away.short}`, why: "Everyone has a score in mind, and they come back to see if they were right.", template: "versus",
            fields: { tag: (m.compName || "").toUpperCase(), title1: "Predict", title2: "the score", home: m.home.short, homeSub: "", away: m.away.short, awaySub: "", info: `${ukLabel(ko)} · ${ukTime(ko)}${m.venue ? " · " + m.venue : ""}`, question: "Predict the score 👇" },
            caption: `${m.home.short} v ${m.away.short} tomorrow, ${ukTime(ko)} kick-off.\n\nPredict the score 👇\n\n${clubTag(m.home.name)} ${compTag(m.comp)} #MatchDay`,
            photoSearch: { term: `${m.home.short} ${m.away.short}`, tip: "A player from each side, or the two managers." } });
          log.push("predictor " + m.id);
        }
        state.predDate = today;
      }

      // automatic player ratings draft, about 90 minutes after full time
      if (S.auto.rat && env("ANTHROPIC_API_KEY") && now.getTime() - (state.lastRatingsTry || 0) > 10 * 60000) {
        const due = (Object.values(matches) as Any[]).find((m) => m.status === "FINISHED" && m.ftAt && !m.ratingsDone && watched(m, S) && now.getTime() - Date.parse(m.ftAt) > 90 * 60000);
        if (due) {
          state.lastRatingsTry = now.getTime();
          const tooLate = now.getTime() - Date.parse(due.ftAt) > 8 * 3600e3;
          const rep = tooLate ? null : await findReport(due);
          if (rep) {
            const side = S.teams.some((t: string) => (due.home.name + due.home.short).toLowerCase().includes(t.toLowerCase())) ? "home" : "away";
            const r = await claudeRatings(due, side, rep.text);
            if (r && Array.isArray(r.rows) && r.rows.length) {
              const tn = side === "home" ? due.home.short : due.away.short;
              await autoPost(`auto-rat-${due.id}`, { when: "Post now", slot: now.toISOString(), format: "Player ratings", title: `${tn} ratings`, why: "Everyone thinks the marks are wrong, so they comment to say so.", template: "ratings",
                fields: { tag: "PLAYER RATINGS", title: `${tn} ratings`, subtitle: `${due.home.short} ${due.hs}-${due.as} ${due.away.short}`, rows: r.rows.slice(0, 11), question: "Who have we got wrong?" },
                caption: `Our ${tn} ratings from ${due.home.short} ${due.hs}-${due.as} ${due.away.short} 📝\n\n${r.rows.slice(0, 11).map((x: Any) => x.name + " " + x.score).join("\n")}\n\nWho have we got wrong? 👇\n\n${clubTag(side === "home" ? due.home.name : due.away.name)} ${compTag(due.comp)} #PlayerRatings`,
                sources: [{ t: "BBC Sport", u: rep.link }], photoSearch: { term: `${r.motm || tn} ${tn}`, tip: "Your man of the match, close-up." } });
              await merge("matches", String(due.id), { ratingsDone: true }); log.push("ratings " + due.id);
            }
          } else if (tooLate) await merge("matches", String(due.id), { ratingsDone: true });
        }
      }
    } catch (e) { log.push("football: " + e); }
  }

  if (now.getTime() - (state.lastSystem || 0) > 10 * 60000) {
    await set("meta", "system", { lastTick: now.toISOString(), claude: !!env("ANTHROPIC_API_KEY"), football: !!env("FOOTBALL_DATA_KEY"), higgsfield: !!env("HIGGSFIELD_KEY"), push: !!(env("VAPID_PUBLIC") && env("VAPID_PRIVATE")), scan: !!env("GH_TOKEN") });
    state.lastSystem = now.getTime();
  }
  await set("meta", "football", state);
  return json({ ok: true, log });
});
