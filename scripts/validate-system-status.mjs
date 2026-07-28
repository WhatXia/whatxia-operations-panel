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

const started = Date.now();
const trips = await supabase
  .from("trips")
  .select("id", { count: "exact", head: true });
const drivers = await supabase
  .from("drivers")
  .select("id", { count: "exact", head: true })
  .eq("status", "active");
const sessions = await supabase
  .from("conversation_sessions")
  .select("updated_at")
  .order("updated_at", { ascending: false })
  .limit(1);
const tunnels = await supabase
  .from("conversation_tunnels")
  .select("id", { count: "exact", head: true })
  .eq("status", "active");
const auth = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
const ms = Date.now() - started;

console.log(
  JSON.stringify(
    {
      ok: !trips.error,
      probeMs: ms,
      tripsError: trips.error?.message ?? null,
      driversActive: drivers.count,
      lastSession: sessions.data?.[0]?.updated_at ?? null,
      activeTunnels: tunnels.count,
      authUsers: auth.data?.users?.length ?? null,
      authError: auth.error?.message ?? null,
    },
    null,
    2,
  ),
);

if (trips.error) process.exit(1);
