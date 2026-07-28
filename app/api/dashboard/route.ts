import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { fetchDashboardSnapshot } from "@/lib/dashboard/queries";
import type { DashboardResponse } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_DASHBOARD", resource: "dashboard" },
    async () => {
      const data = await fetchDashboardSnapshot();
      const body: DashboardResponse = { ok: true, data };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    },
  );
}
