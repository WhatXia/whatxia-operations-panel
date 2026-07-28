import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { fetchSystemStatusSnapshot } from "@/lib/system/queries";
import type { SystemStatusResponse } from "@/lib/system/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_SYSTEM_STATUS", resource: "system-status" },
    async () => {
      const data = await fetchSystemStatusSnapshot();
      const body: SystemStatusResponse = { ok: true, data };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    },
  );
}
