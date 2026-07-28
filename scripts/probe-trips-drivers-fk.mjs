import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of text.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i <= 0) continue;
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const hints = [
  "drivers!trips_driver_id_fkey(id,name,plate)",
  "drivers!driver_id(id,name,plate)",
  "drivers!trips_driver_id_fkey(id)",
];

for (const hint of hints) {
  const { data, error } = await s
    .from("trips")
    .select(`id, ${hint}`)
    .limit(1);
  console.log(
    JSON.stringify({
      hint,
      ok: !error,
      error: error?.message ?? null,
      sample: data?.[0] ?? null,
    }),
  );
}

// Also list constraints via rpc if available - skip
process.exit(0);
