// Breaking news scan, the low-cost way (runs every hour):
// 1) read the free news feeds and keep only headlines not seen before (free)
// 2) nothing new? stop here, costs nothing
// 3) a cheap Claude model decides what's big (a fraction of a penny)
// 4) only for big stories: read the article (free) and write a ready post (about 1-2p each)
import { need, db, claude, parseJSON, ukNow, slug, CAPTION_RULES, FIELD_RULES, readFeeds, articleText, budgetLeft, recordSpend, MODEL_CHEAP } from "./lib.mjs";
need("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "ANTHROPIC_API_KEY");

const now = ukNow();
const [existing, meta] = await Promise.all([db.list("breaking"), db.list("meta")]);
for (const b of existing) if (Date.now() - (Date.parse(b.publishedAt) || 0) > 48 * 3600e3) await db.del("breaking", b.id);
const listed = existing.filter((b) => Date.now() - (Date.parse(b.publishedAt) || 0) <= 48 * 3600e3);
const seenDoc = meta.find((m) => m.id === "seen") || {}; const seen = new Set(seenDoc.links || []);

const items = await readFeeds(4);
const fresh = items.filter((i) => !seen.has(i.link));
const finish = async (found) => {
  const links = [...new Set([...items.map((i) => i.link), ...(seenDoc.links || [])])].slice(0, 400);
  await db.set("meta", "seen", { links });
  await db.set("meta", "breaking", { scannedAt: now.iso, found });
  await recordSpend();
};
console.log(`${items.length} headlines in the last 4h, ${fresh.length} new`);
if (!fresh.length) { await finish(listed.length); console.log("Nothing new."); process.exit(0); }
if (!(await budgetLeft())) { await finish(listed.length); console.log("Monthly budget nearly used: skipping."); process.exit(0); }

// how many outlets carry each story helps judge "rising" vs "just broke"
const TPL = ["quote", "headline", "stat", "list", "poll", "split", "versus", "result"];
const triage = parseJSON(await claude({
  model: MODEL_CHEAP, maxTokens: 1500,
  system: "You are the breaking-news editor of Pundit Bible, a UK football social page. Be strict: only genuinely big stories.",
  prompt: `It is ${now.full}. NEW headlines (with time published):\n${fresh.slice(0, 40).map((i, n) => `${n}. [${i.outlet}, ${i.at}] ${i.title} — ${i.summary}`).join("\n")}\n\nAll headlines from the last 4 hours (to count how many outlets cover a story):\n${items.slice(0, 100).map((i) => `- [${i.outlet}] ${i.title}`).join("\n")}\n\nAlready on our breaking list:\n${listed.map((b) => `${b.id}: ${b.headline}`).join("\n") || "(none)"}\n\nWhich NEW headlines are big enough for Pundit Bible's audience to comment on (football first: Premier League, England, big transfers, sackings, injuries to stars, controversy, big quotes; other sport only if huge)? Score heat 1-5. Ignore anything under heat 3, routine previews, women's football unless huge, and stories already on our list (for those, return an update instead).\nReply with only JSON: {"new":[{"n": number, "heat": 3-5, "heatWhy": "short line", "trend": "just-broke|rising|trending", "outlets": number}], "updates":[{"id": "existing id", "trend": "...", "heat": n, "outlets": n}]}`,
}));
for (const u of triage.updates || []) if (listed.some((b) => b.id === u.id)) await db.update("breaking", u.id, { trend: u.trend, heat: u.heat, outlets: u.outlets, lastSeen: now.iso });
const big = (triage.new || []).filter((x) => fresh[x.n] && x.heat >= 3).sort((a, b) => b.heat - a.heat).slice(0, 3);

let n = 0;
for (const x of big) {
  const it = fresh[x.n];
  const text = await articleText(it.link, 5000);
  const s = parseJSON(await claude({
    model: MODEL_CHEAP, maxTokens: 3000,
    system: "You write breaking-news posts for Pundit Bible. UK English. Use ONLY facts and quotes in the text given; quotes word for word; never add anything from memory.",
    prompt: `Story from ${it.outlet} (${it.at}):\n${it.title}\n${it.summary}\n${text}\n\nWrite: {"headline": "short and punchy", "sport": "Football|Boxing|...", "summary": "2-3 sentences", "facts": ["..."], "quotes": [{"text":"exact words","who":"name"}], "angle": "best post angle in one line", "post": {"title","format","why","template": one of ${TPL.join("|")},"theme": brand|red|maroon|charcoal|navy|sky|green|england|purple,"fields","caption","photoSearch":{"term","tip"}, plus "photoSearch2" for split}}\nIn the post, tag starts "BREAKING ·".\n${CAPTION_RULES}\n${FIELD_RULES}\nReply with only JSON.`,
  }));
  if (!s || !s.headline) continue;
  if (s.post && !TPL.includes(s.post.template)) delete s.post;
  const id = it.at.slice(0, 16).replace(/[-:]/g, "").replace("T", "-") + "-" + slug(s.headline).slice(0, 40);
  await db.set("breaking", id, { ...s, publishedAt: it.at, firstSeen: now.iso, lastSeen: now.iso, sources: [{ t: it.outlet, u: it.link }], outlets: x.outlets || 1, trend: x.trend || "just-broke", heat: x.heat, heatWhy: x.heatWhy || "" });
  n++;
  console.log("new:", x.trend, x.heat, s.headline);
}
await finish(listed.length + n);
console.log(`Done: ${n} new stories.`);
