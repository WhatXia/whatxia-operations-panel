import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().replace(/^\uFEFF/, "");
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase
  .from("trips")
  .select("id,status,driver_name,created_at,started_at,finished_at")
  .order("created_at", { ascending: false })
  .limit(50);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const completed = data.filter((t) => t.status === "COMPLETED").length;
const cancelled = data.filter((t) =>
  ["CANCELLED", "cancelled_no_driver"].includes(t.status),
).length;
const withDuration = data.filter(
  (t) => t.status === "COMPLETED" && t.started_at && t.finished_at,
).length;
const withAcceptance = data.filter(
  (t) => t.started_at && t.created_at && t.driver_name,
).length;

console.log(
  JSON.stringify(
    {
      ok: true,
      sample: data.length,
      completed,
      cancelled,
      withDuration,
      withAcceptance,
    },
    null,
    2,
  ),
);
