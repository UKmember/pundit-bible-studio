// Higgsfield: Kling image-to-video for your cards, and AI backgrounds. Your key stays here, never in the app.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const env = (k: string) => Deno.env.get(k) || "";
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const API = "https://api.higgsfield.ai";
const VIDEO_MODEL = env("HF_VIDEO_MODEL") || "kling-video/v2.5-turbo/pro/image-to-video";
const IMAGE_MODEL = env("HF_IMAGE_MODEL") || "higgsfield-ai/soul/v2/standard";
const FALLBACK_USD: Record<string, number> = { video5: 0.1925, video10: 0.385, image: 0.006 };
// deno-lint-ignore no-explicit-any
type Any = any;
const H = () => ({ Authorization: `Key ${env("HIGGSFIELD_KEY")}`, "Content-Type": "application/json" });

async function spentGbp() {
  const { data } = await sb.from("docs").select("data").eq("collection", "meta").eq("id", "hfusage").maybeSingle();
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()).slice(0, 7);
  return data && data.data && data.data.month === month ? Number(data.data.usd || 0) * Number(env("USD_TO_GBP") || 0.78) : 0;
}
async function estimate(model: string, input: Any, fallback: number) {
  try {
    const r = await fetch(`${API}/estimate/${model}`, { method: "POST", headers: H(), body: JSON.stringify(input) });
    if (r.ok) { const j = await r.json(); const u = Number(j.usd); if (u > 0) return u; }
  } catch (_) { /* use fallback */ }
  return fallback;
}
function b64ToBytes(b64: string) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await sb.auth.getUser(token);
  if (!u || !u.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);
  if (!env("HIGGSFIELD_KEY")) return json({ code: "not_set_up", message: "Higgsfield isn't connected yet (setup guide, step 8)." }, 400);
  const body = await req.json().catch(() => ({}));
  const budget = Number(env("HF_BUDGET_GBP") || 5);

  try {
    if (body.action === "video" || body.action === "image") {
      if ((await spentGbp()) >= budget) return json({ code: "budget", message: `This month's Higgsfield budget (£${budget}) is used up. It resets on the 1st.` });
      let model: string, input: Any, fb: number;
      if (body.action === "video") {
        // 1) upload the card image to Higgsfield
        const up = await (await fetch(`${API}/files/generate-upload-url`, { method: "POST", headers: H(), body: JSON.stringify({ content_type: "image/jpeg" }) })).json();
        if (!up.upload_url) return json({ code: "error", message: "Higgsfield upload failed: " + JSON.stringify(up).slice(0, 200) }, 502);
        const put = await fetch(up.upload_url, { method: "PUT", headers: up.upload_headers || { "Content-Type": "image/jpeg" }, body: b64ToBytes(body.image) });
        if (!put.ok) return json({ code: "error", message: "Couldn't upload the image to Higgsfield (" + put.status + ")." }, 502);
        const duration = Number(body.duration) === 10 ? 10 : 5;
        model = VIDEO_MODEL; fb = duration === 10 ? FALLBACK_USD.video10 : FALLBACK_USD.video5;
        input = { prompt: String(body.prompt || "").slice(0, 2400), image_url: up.public_url, duration, cfg_scale: 0.5, negative_prompt: String(body.negative || "").slice(0, 1200) };
        if (!/v2\.5/.test(model)) delete input.negative_prompt;
      } else {
        model = IMAGE_MODEL; fb = FALLBACK_USD.image;
        input = { prompt: String(body.prompt || "").slice(0, 2000), aspect_ratio: body.aspect || "4:5", resolution: "1080p", batch_size: 1 };
      }
      const usd = await estimate(model, input, fb);
      const r = await fetch(`${API}/${model}`, { method: "POST", headers: H(), body: JSON.stringify(input) });
      const sub = await r.json().catch(() => ({}));
      if (r.status === 403) return json({ code: "no_credit", message: "Your Higgsfield API balance is empty. Top it up at open.higgsfield.ai." });
      if (!r.ok || !sub.request_id) return json({ code: "error", message: `Higgsfield said no (${r.status}): ${JSON.stringify(sub).slice(0, 200)}` }, 502);
      await sb.from("docs").upsert({ collection: "hfjobs", id: sub.request_id, data: { kind: body.action, model, usd, post: body.post || null, status: "queued", at: new Date().toISOString(), statusUrl: sub.status_url } }, { onConflict: "collection,id" });
      if (body.post) await sb.rpc("doc_merge", { p_collection: "posts", p_id: String(body.post), p_patch: { hfPending: { id: sub.request_id, kind: body.action, at: new Date().toISOString() } } });
      return json({ id: sub.request_id, usd });
    }

    if (body.action === "status") {
      const { data: row } = await sb.from("docs").select("data").eq("collection", "hfjobs").eq("id", String(body.id)).maybeSingle();
      if (!row) return json({ code: "not_found", message: "Unknown job" }, 404);
      const job = row.data;
      if (job.file) return json({ status: "completed", file: job.file });
      if (["blocked", "failed", "canceled"].includes(job.status)) return json({ status: job.status, message: job.error || "" });
      await sb.rpc("doc_merge", { p_collection: "hfjobs", p_id: String(body.id), p_patch: { lastPoll: new Date().toISOString() } });
      const s = await (await fetch(job.statusUrl || `${API}/requests/${body.id}/status`, { headers: H() })).json();
      if (s.status === "completed") {
        const url = job.kind === "video" ? s.video && s.video.url : s.images && s.images[0] && s.images[0].url;
        if (!url) return json({ status: "failed", message: "Finished but no file came back." });
        const f = await fetch(url); const bytes = new Uint8Array(await f.arrayBuffer());
        const ext = job.kind === "video" ? "mp4" : (/png/.test(f.headers.get("content-type") || "") ? "png" : "jpg");
        const file = `ai/${body.id}.${ext}`;
        const upl = await sb.storage.from("photos").upload(file, bytes, { contentType: job.kind === "video" ? "video/mp4" : (ext === "png" ? "image/png" : "image/jpeg"), upsert: true });
        if (upl.error) return json({ status: "failed", message: "Couldn't save the result: " + upl.error.message });
        await sb.rpc("add_usage", { p_usd: Number(job.usd || 0), p_doc: "hfusage" });
        await sb.rpc("doc_merge", { p_collection: "hfjobs", p_id: String(body.id), p_patch: { status: "completed", file } });
        if (job.post) await sb.rpc("doc_merge", { p_collection: "posts", p_id: String(job.post), p_patch: job.kind === "video" ? { hfVideo: { file, at: new Date().toISOString() }, hfPending: null } : { bg: { file }, hfPending: null } });
        return json({ status: "completed", file });
      }
      if (s.status === "nsfw") {
        await sb.rpc("doc_merge", { p_collection: "hfjobs", p_id: String(body.id), p_patch: { status: "blocked" } });
        if (job.post) await sb.rpc("doc_merge", { p_collection: "posts", p_id: String(job.post), p_patch: { hfPending: null } });
        return json({ status: "blocked", message: "Higgsfield's safety filter blocked this one (often because of a real person's face). You weren't charged." });
      }
      if (s.status === "failed" || s.status === "canceled") {
        await sb.rpc("doc_merge", { p_collection: "hfjobs", p_id: String(body.id), p_patch: { status: s.status, error: s.error || "" } });
        if (job.post) await sb.rpc("doc_merge", { p_collection: "posts", p_id: String(job.post), p_patch: { hfPending: null } });
        return json({ status: s.status, message: s.error || "It didn't work this time. You weren't charged." });
      }
      return json({ status: s.status || "queued" });
    }
    return json({ code: "bad_request", message: "Unknown action" }, 400);
  } catch (e) {
    return json({ code: "error", message: String(e).slice(0, 300) }, 500);
  }
});
