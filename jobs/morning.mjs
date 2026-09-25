// Morning news check, the low-cost way:
// 1) read the free BBC / Sky / Guardian / ESPN feeds for the last 36 hours (free)
// 2) a cheap Claude model picks the 6 best stories (about 1p)
// 3) read those articles (free) and Claude writes the 6 posts from them (about 10p)
// 4) once a week, one small web search for upcoming big fixtures (about 10p)
import { need, db, claude, parseJSON, ukNow, slug, CAPTION_RULES, FIELD_RULES, TEMPLATES, THEMES, blankPhoto, readFeeds, articleText, budgetLeft, recordSpend, MODEL_CHEAP } from "./lib.mjs";
need("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "ANTHROPIC_API_KEY");

const now = ukNow();
const [posts, fixtures] = await Promise.all([db.list("posts"), db.list("fixtures")]);
const cutoff = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
for (const p of posts) if (p.status === "posted" && (p.batch || "") < cutoff(14)) await db.del("posts", p.id);
for (const f of fixtures) if ((f.date || "") < cutoff(3)) await db.del("fixtures", f.id);

if (!(await budgetLeft())) { console.log("Monthly budget nearly used: skipping today's research."); process.exit(0); }

const items = (await readFeeds(36)).filter((i) => !/women'?s|wsl\b/i.test(i.title) || /england/i.test(i.title));
if (!items.length) throw new Error("No news feeds could be read.");
console.log(items.length + " headlines from the feeds");
const todo = posts.filter((p) => p.status !== "posted").map((p) => "- " + p.title).join("\n") || "(none)";
const withResults = posts.filter((p) => p.results).map((p) => ({ format: p.format, template: p.template, ...p.results }));
const list = items.slice(0, 150).map((i, n) => `${n}. [${i.outlet}] ${i.title} — ${i.summary}`).join("\n");

// Step 2: pick
const pick = parseJSON(await claude({
  model: MODEL_CHEAP, maxTokens: 1500,
  system: "You are the news editor of Pundit Bible, a UK football social page. Pick what gets the most comments and shares from UK football fans.",
  prompt: `Today is ${now.full}. Headlines from the last 36 hours:\n${list}\n\nAlready waiting to be posted (don't repeat):\n${todo}\n\nPast results by format (lean toward what got most comments): ${withResults.length ? JSON.stringify(withResults).slice(0, 3000) : "not enough yet"}\n\nPick the 6 best stories for posts (mostly Premier League / England; big names, controversy, money, shock, big quotes). For each choose a template: quote (a big quote), stat (a striking number), headline, list, poll (4 options), split (who's better, two people), h2h (two players' numbers), versus (predict a big upcoming game), ranking, result, ratings, carousel, guess (guess the player). Use a mix: at least one quote, one stat or result, one debate (poll/split/h2h) and one versus if a big game is coming.\nReply with only JSON: {"picks":[{"n": headline number, "also": [other headline numbers about the same story], "template": "...", "angle": "one line"}]}`,
}));
const picks = (pick.picks || []).filter((p) => items[p.n]).slice(0, 6);
if (!picks.length) throw new Error("No stories picked");

// Step 3: read the articles and write
const stories = [];
for (const p of picks) {
  const src = [items[p.n], ...(p.also || []).map((n) => items[n]).filter(Boolean)].slice(0, 2);
  const texts = await Promise.all(src.map((s) => articleText(s.link, 3500)));
  stories.push({ template: p.template, angle: p.angle, sources: src.map((s) => ({ t: s.outlet, u: s.link })), text: src.map((s, i) => `${s.outlet}: ${s.title}\n${s.summary}\n${texts[i]}`).join("\n\n") });
}
const out = parseJSON(await claude({
  maxTokens: 12000,
  system: "You write Pundit Bible posts. UK English. Use ONLY facts, numbers and quotes that appear in the article text given. Quotes must be word for word. Never add anything from memory.",
  prompt: `Today is ${now.full}. Write one post for each story below. Spread them over the next 2 days in slots 08:00, 12:30, 20:30 (e.g. "${now.label} · 20:30").
Each post: {"story": story number, "when", "slot": "YYYY-MM-DDTHH:MM" (UK time, matching "when"), "format": "Hot quote|Stat shock|A/B/C/D poll|Predictor|News card|Full-time result|Who's better?|Player ratings|Carousel|Guess the player|Head to head", "title": "12-60 chars, names first", "why": "1 sentence on why it gets comments", "template": use the suggested one unless the facts don't support it (one of ${TEMPLATES.join("|")}), "theme": one of ${THEMES.join("|")} (club colours), "photoSearch": {"term": "2-5 word Google Images search for the right person", "tip": "what shot to pick"}, "photoSearch2": for split/h2h person B, "caption", "fields"}
${CAPTION_RULES}
Ratings are Pundit Bible's own opinion: say "our ratings". For "guess", never reveal the answer in the caption.
${FIELD_RULES}

${stories.map((s, i) => `=== STORY ${i} (suggested template: ${s.template}; angle: ${s.angle}) ===\n${s.text}`).join("\n\n")}

Reply with only JSON: {"posts":[...]}`,
}));

// UK wall-clock "YYYY-MM-DDTHH:MM" -> ISO
function slotISO(s) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s || "")) return null;
  const g = new Date(s.slice(0, 16) + ":00Z");
  const off = new Date(g.toLocaleString("en-US", { timeZone: "Europe/London" })).getTime() - new Date(g.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(g.getTime() - off).toISOString();
}
let n = 0;
for (const p of out.posts || []) {
  if (!p || !TEMPLATES.includes(p.template) || !p.fields || !p.caption) continue;
  const st = stories[p.story] || stories[n] || {};
  n++;
  const doc = {
    order: n, batch: now.date, batchLabel: `News check · ${now.label}`, status: "todo",
    when: p.when || "", slot: slotISO(p.slot), format: p.format || "", title: p.title || "", why: p.why || "",
    template: p.template, theme: THEMES.includes(p.theme) ? p.theme : "brand",
    fields: p.fields, caption: p.caption, sources: st.sources || [],
    photo: blankPhoto(), photoSearch: p.photoSearch || { term: p.title, tip: "" },
  };
  if (p.template === "split" || p.template === "h2h") { doc.photo2 = blankPhoto(); doc.photoSearch2 = p.photoSearch2 || { term: p.fields.bName || "", tip: "" }; }
  await db.set("posts", `${now.date}-${slug(p.title)}`, doc);
  console.log("post:", doc.when, "|", doc.title);
}

// Step 4: fixtures, once a week (Mondays) or when the list is running low
const upcoming = fixtures.filter((f) => (f.date || "") >= now.date);
const isMonday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(new Date()) === "Mon";
if (!process.env.FOOTBALL_DATA_KEY && (isMonday || upcoming.length < 4)) {
  const fx = parseJSON(await claude({
    search: 3, maxTokens: 3000,
    system: "You are a careful football researcher. Only list fixtures you found in your searches.",
    prompt: `Today is ${now.full}. Find the big football fixtures in the next 14 days: Premier League games involving Arsenal, Chelsea, Liverpool, Man City, Man Utd, Spurs or Newcastle, plus derbies and top-of-table games; all England games; Champions League ties with English clubs. UK kick-off times.\nReply with only JSON: {"fixtures":[{"date":"YYYY-MM-DD","ko":"HH:MM","home":"...","away":"...","comp":"..."}]}`,
  }));
  const have = new Map(fixtures.map((f) => [f.id, f]));
  let added = 0;
  for (const f of fx.fixtures || []) {
    if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f.date) || !f.home || !f.away) continue;
    const id = `${f.date}-${slug(f.home)}-v-${slug(f.away)}`; const ex = have.get(id);
    if (ex) { if (f.ko && f.ko !== ex.ko) await db.update("fixtures", id, { ko: f.ko }); continue; }
    await db.set("fixtures", id, { date: f.date, ko: f.ko || "", home: f.home, away: f.away, comp: f.comp || "", hs: 0, as: 0, goals: [], status: "upcoming" });
    added++;
  }
  console.log(added + " fixtures added");
}

const tomorrow = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.now() + 864e5));
await db.set("meta", "status", { lastRefresh: now.iso, nextRun: `${tomorrow}, 7:00am` });
await recordSpend();
console.log(`Done: ${n} posts.`);
