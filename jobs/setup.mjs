// One-off set-up: database, login, secrets, and your existing posts. Safe to run again.
import fs from "node:fs";
import crypto from "node:crypto";
import { need, mgmt, db, SB_URL, keys } from "./lib.mjs";
// every GitHub secret and variable, so new keys work without editing the workflow file
for (const src of [process.env.ALL_SECRETS, process.env.ALL_VARS]) {
  try { for (const [k, v] of Object.entries(JSON.parse(src || "{}"))) if (!process.env[k] && typeof v === "string" && v) process.env[k] = v; } catch { /* ignore */ }
}
need("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN");
const REF = process.env.SUPABASE_PROJECT_REF;

console.log("1/6 Database tables and photo storage…");
await mgmt(`/v1/projects/${REF}/database/query`, { method: "POST", body: JSON.stringify({ query: fs.readFileSync("supabase/schema.sql", "utf8") }) });

console.log("2/6 Switching off public sign-ups…");
await mgmt(`/v1/projects/${REF}/config/auth`, { method: "PATCH", body: JSON.stringify({ disable_signup: true }) });

console.log("3/6 Your login…");
const { service } = await keys();
if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
  const h = { apikey: service, "Content-Type": "application/json", ...(service.startsWith("eyJ") ? { Authorization: "Bearer " + service } : {}) };
  const r = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD, email_confirm: true }) });
  const t = await r.text();
  if (r.ok) console.log("   Login created for " + process.env.OWNER_EMAIL);
  else if (/already|registered|exists/i.test(t)) console.log("   Login already exists, leaving it as it is.");
  else throw new Error("Couldn't create the login: " + t.slice(0, 300));
} else console.log("   OWNER_EMAIL / OWNER_PASSWORD secrets not set, skipping.");

console.log("4/6 Secrets for the app's Claude features…");
const secrets = [];
if (process.env.ANTHROPIC_API_KEY) secrets.push({ name: "ANTHROPIC_API_KEY", value: process.env.ANTHROPIC_API_KEY });
if (process.env.SCAN_TOKEN) secrets.push({ name: "GH_TOKEN", value: process.env.SCAN_TOKEN }, { name: "GH_REPO", value: process.env.GITHUB_REPOSITORY || "" });
if (process.env.MONTHLY_BUDGET_GBP) secrets.push({ name: "MONTHLY_BUDGET_GBP", value: process.env.MONTHLY_BUDGET_GBP });
if (process.env.CLAUDE_MODEL) secrets.push({ name: "CLAUDE_MODEL", value: process.env.CLAUDE_MODEL });
if (process.env.FOOTBALL_DATA_KEY) secrets.push({ name: "FOOTBALL_DATA_KEY", value: process.env.FOOTBALL_DATA_KEY });
if (process.env.HIGGSFIELD_KEY) secrets.push({ name: "HIGGSFIELD_KEY", value: process.env.HIGGSFIELD_KEY.trim() });
if (process.env.OPUSCLIP_KEY) secrets.push({ name: "OPUS_KEY", value: process.env.OPUSCLIP_KEY.trim() });
for (const k of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "META_APP_ID", "META_APP_SECRET"]) if (process.env[k]) secrets.push({ name: k, value: process.env[k].trim() });
if (process.env.HF_BUDGET_GBP) secrets.push({ name: "HF_BUDGET_GBP", value: process.env.HF_BUDGET_GBP });
if (process.env.OWNER_EMAIL) secrets.push({ name: "VAPID_SUBJECT", value: "mailto:" + process.env.OWNER_EMAIL });
// phone alert keys: made once, the public half is stored for the app
const vapid = (await db.list("meta")).find((d) => d.id === "vapid");
if (!vapid) {
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  const pub = ecdh.getPublicKey().toString("base64url"), priv = ecdh.getPrivateKey().toString("base64url");
  secrets.push({ name: "VAPID_PUBLIC", value: pub }, { name: "VAPID_PRIVATE", value: priv });
  await db.set("meta", "vapid", { publicKey: pub });
  console.log("   Made new phone-alert keys");
}
// the every-minute background job
const cronSecret = crypto.randomBytes(24).toString("hex");
secrets.push({ name: "CRON_SECRET", value: cronSecret });
if (secrets.length) await mgmt(`/v1/projects/${REF}/secrets`, { method: "POST", body: JSON.stringify(secrets) });
await mgmt(`/v1/projects/${REF}/database/query`, { method: "POST", body: JSON.stringify({ query: `
select cron.unschedule(jobid) from cron.job where jobname = 'pb-tick';
select cron.schedule('pb-tick', '* * * * *', $cron$ select net.http_post(url := '${SB_URL}/functions/v1/tick', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','${cronSecret}'), body := '{}'::jsonb, timeout_milliseconds := 60000) $cron$);` }) });
console.log("   Background checks scheduled every minute");
console.log("   " + (secrets.map((s) => s.name).join(", ") || "none"));

console.log("6/6 Bringing across your posts from the Claude version…");
if (fs.existsSync("data/import.json")) {
  const data = JSON.parse(fs.readFileSync("data/import.json", "utf8"));
  let n = 0;
  for (const [c, docs] of Object.entries(data)) {
    const have = new Set((await db.list(c)).map((d) => d.id));
    for (const [id, d] of Object.entries(docs)) { if (have.has(id)) continue; await db.set(c, id, d); n++; }
  }
  if (fs.existsSync("data/photos")) for (const f of fs.readdirSync("data/photos")) {
    await db.upload(f, fs.readFileSync("data/photos/" + f), f.endsWith(".png") ? "image/png" : "image/jpeg");
  }
  console.log(`   ${n} documents imported.`);
}
console.log("Set-up finished. Now run the 'Deploy app' workflow.");
