// Writes dist/config.js with your Supabase address and public (anon) key.
import fs from "node:fs";
import { need, keys, SB_URL } from "./lib.mjs";
need("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN");
const { anon } = await keys();
if (!anon) throw new Error("Couldn't find the project's anon/publishable key.");
const cfg = { url: SB_URL, key: anon, scanNote: process.env.SCAN_NOTE || "Scans run every hour from 7am to 11pm.", budgetGbp: Number(process.env.MONTHLY_BUDGET_GBP || 10), hfBudgetGbp: Number(process.env.HF_BUDGET_GBP || 5) };
fs.writeFileSync("dist/config.js", "window.PB_CONFIG=" + JSON.stringify(cfg) + ";\n");
console.log("config.js written for " + SB_URL);
