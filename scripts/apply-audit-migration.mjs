/**
 * Aplica supabase/migrations/001_audit_logs.sql vía Management API.
 * Requiere: SUPABASE_ACCESS_TOKEN (Personal Access Token de supabase.com)
 *
 * Uso:
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/apply-audit-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "vquuizixlkqflmyiwvmy";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN. Alternativa: pegar 001_audit_logs.sql en el SQL Editor del Dashboard.",
  );
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/001_audit_logs.sql"),
  "utf8",
);

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const text = await response.text();
if (!response.ok) {
  console.error("Migration failed:", response.status, text);
  process.exit(1);
}

console.log("Migration applied OK");
console.log(text.slice(0, 500));
