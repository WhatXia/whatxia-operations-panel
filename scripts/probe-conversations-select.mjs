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

const select = `
  id, status, passenger_phone, passenger_id, driver_id, driver_phone, driver_name,
  pickup_label, dropoff_label, pickup_neighborhood, quoted_fare, final_fare, currency,
  eta_minutes, duration_seconds, wait_seconds, created_at, updated_at, started_at, finished_at,
  passengers(preferred_name, full_name, name, whatsapp_name, phone),
  drivers!trips_driver_id_fkey(id, name, full_name, preferred_name, phone, plate, vehicle_brand, vehicle_model, vehicle_color, status, is_available)
`;

const list = await s
  .from("trips")
  .select(select)
  .order("created_at", { ascending: false })
  .limit(3);

console.log(
  JSON.stringify({
    listOk: !list.error,
    listError: list.error?.message ?? null,
    count: list.data?.length ?? 0,
    firstDriver: list.data?.[0]?.drivers ?? null,
  }),
);

if (list.data?.[0]?.id) {
  const detail = await s
    .from("trips")
    .select(select)
    .eq("id", list.data[0].id)
    .maybeSingle();
  console.log(
    JSON.stringify({
      detailOk: !detail.error,
      detailError: detail.error?.message ?? null,
      id: detail.data?.id ?? null,
    }),
  );
}

process.exit(list.error || (list.data?.[0] && !list.data) ? 1 : 0);
