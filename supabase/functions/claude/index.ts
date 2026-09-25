// Sends the app's AI requests to Claude with your API key (kept secret here, never in the app).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5";
const PRICES: Record<string, [number, number]> = { "claude-sonnet-5": [2, 10], "claude-haiku-4-5": [1, 5], "claude-haiku-4-5-20251001": [1, 5], "claude-opus-5-5": [4, 20] };
const BUDGET_GBP = Number(Deno.env.get("MONTHLY_BUDGET_GBP") || 10);
const USD_TO_GBP = Number(Deno.env.get("USD_TO_GBP") || 0.78);
async function spentGbp() {
  const { data } = await admin.from("docs").select("data").eq("collection", "meta").eq("id", "usage").maybeSingle();
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  return data && data.data && data.data.month === month ? Number(data.data.usd || 0) * USD_TO_GBP : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ code: "bad_request", message: "POST only" }, 405);

  // Only a signed-in user of this project can use it.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u || !u.user) return json({ code: "not_granted", message: "Please sign in again." }, 401);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ code: "not_granted", message: "The Claude API key hasn't been added yet." }, 500);

  if ((await spentGbp()) >= BUDGET_GBP)
    return json({ code: "budget", message: `This month's Claude budget (£${BUDGET_GBP}) is used up. It resets on the 1st.` }, 200);

  let body: { prompt?: string; images?: { type: string; data: string }[]; json?: boolean; max_tokens?: number };
  try { body = await req.json(); } catch { return json({ code: "bad_request", message: "Bad request" }, 400); }
  const prompt = String(body.prompt || "").slice(0, 60000);
  if (!prompt) return json({ code: "bad_request", message: "Empty prompt" }, 400);

  const content: unknown[] = (body.images || []).slice(0, 4).map((i) => ({
    type: "image",
    source: { type: "base64", media_type: /png|webp|gif/.test(i.type) ? i.type : "image/jpeg", data: i.data },
  }));
  content.push({ type: "text", text: prompt + (body.json ? "\n\nReply with only valid JSON: no other text, no code fences." : "") });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: Math.min(Math.max(Number(body.max_tokens) || 2500, 256), 8000),
      system: "You help run Pundit Bible, a UK football social media page. Write in UK English.",
      messages: [{ role: "user", content }],
    }),
  });
  if (r.status === 429 || r.status === 529) return json({ code: "rate_limited", message: "Claude is busy. Try again in a minute." }, 429);
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) return json({ code: "error", message: (out && out.error && out.error.message) || "Claude request failed" }, 502);
  if (out.stop_reason === "refusal") return json({ code: "refused", message: "Claude couldn't help with that one." }, 200);
  const use = out.usage || {}; const p = PRICES[MODEL] || [2, 10];
  const usd = ((use.input_tokens || 0) * p[0] + (use.output_tokens || 0) * p[1]) / 1e6;
  await admin.rpc("add_usage", { p_usd: Number(usd.toFixed(5)) });
  const text = (out.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return json({ text });
});
