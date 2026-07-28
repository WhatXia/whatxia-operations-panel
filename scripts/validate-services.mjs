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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const filters = {
  all: null,
  requested: ["SEARCHING"],
  accepted: ["ASSIGNED", "ETA_INFORMED", "DRIVER_ARRIVED"],
  in_progress: ["IN_PROGRESS"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED", "cancelled_no_driver"],
};

const counts = {};
for (const [name, statuses] of Object.entries(filters)) {
  let q = supabase
    .from("trips")
    .select("id", { count: "exact", head: true });
  if (statuses) q = q.in("status", statuses);
  const { count, error } = await q;
  if (error) {
    console.error(name, error.message);
    process.exit(1);
  }
  counts[name] = count;
}

const { data, error } = await supabase
  .from("trips")
  .select(
    "id,status,driver_name,pickup_label,dropoff_label,quoted_fare,final_fare,passengers(preferred_name,full_name,name)",
  )
  .order("created_at", { ascending: false })
  .limit(5);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, counts, sampleSize: data.length }, null, 2));
