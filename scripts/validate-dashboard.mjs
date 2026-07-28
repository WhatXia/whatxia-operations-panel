import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
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

const today = new Date();
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(today);
const y = parts.find((p) => p.type === "year").value;
const m = parts.find((p) => p.type === "month").value;
const d = parts.find((p) => p.type === "day").value;
const todayStart = `${y}-${m}-${d}T05:00:00.000Z`;

const active = [
  "SEARCHING",
  "ASSIGNED",
  "ETA_INFORMED",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
];
const cancelled = ["CANCELLED", "cancelled_no_driver"];

const results = {};
results.createdToday = (
  await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart)
).count;
results.active = (
  await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .in("status", active)
).count;
results.completedToday = (
  await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("status", "COMPLETED")
    .gte("created_at", todayStart)
).count;
results.cancelledToday = (
  await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .in("status", cancelled)
    .gte("created_at", todayStart)
).count;
results.driversActive = (
  await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
).count;
results.driversAvailable = (
  await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("is_available", true)
).count;

const { data: recent, error } = await supabase
  .from("trips")
  .select("id,status,driver_name,pickup_label,dropoff_label,created_at")
  .order("created_at", { ascending: false })
  .limit(3);

if (error) {
  console.error("recent error", error);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, results, recent }, null, 2));
