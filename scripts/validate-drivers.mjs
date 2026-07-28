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

const { data, error, count } = await supabase
  .from("drivers")
  .select(
    "id,name,full_name,preferred_name,document_id,phone,plate,vehicle_brand,vehicle_model,status,is_available,created_at",
    { count: "exact" },
  )
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const active = data.filter((d) => d.status === "active").length;
const inactive = data.filter((d) => d.status === "inactive").length;
const available = data.filter((d) => d.is_available).length;
const busy = data.filter((d) => !d.is_available).length;

console.log(
  JSON.stringify(
    {
      ok: true,
      total: count,
      active,
      inactive,
      available,
      busy,
      hasSaldo: false,
      names: data.map((d) => d.preferred_name || d.name),
    },
    null,
    2,
  ),
);
