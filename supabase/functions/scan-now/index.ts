// "Scan now" and "Research new posts now": starts the GitHub workflow straight away.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u || !u.user) return json({ message: "Please sign in again." }, 401);

  const gh = Deno.env.get("GH_TOKEN"), repo = Deno.env.get("GH_REPO");
  if (!gh || !repo) return json({ message: "Scan now isn't switched on (see setup step 7)." }, 400);
  const { kind } = await req.json().catch(() => ({ kind: "breaking" }));
  const file = kind === "morning" ? "morning.yml" : "breaking.yml";

  // no more than one manual start every 5 minutes per job
  const key = "manual-" + (kind === "morning" ? "morning" : "breaking");
  const { data: last } = await admin.from("docs").select("data").eq("collection", "meta").eq("id", key).maybeSingle();
  const at = last && last.data && Date.parse(last.data.at);
  if (at && Date.now() - at < 5 * 60 * 1000) return json({ message: "Already running. Give it a few minutes." }, 429);

  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${gh}`, Accept: "application/vnd.github+json", "User-Agent": "pundit-bible-studio" },
    body: JSON.stringify({ ref: "main" }),
  });
  if (r.status !== 204) return json({ message: "GitHub said no (" + r.status + "). Check the GH_TOKEN in setup step 7." }, 502);
  await admin.from("docs").upsert({ collection: "meta", id: key, data: { at: new Date().toISOString() } }, { onConflict: "collection,id" });
  return json({ ok: true });
});
