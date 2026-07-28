import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { parseMetricsPreset } from "@/lib/metrics/ranges";
import { fetchMetricsSnapshot } from "@/lib/metrics/queries";
import type { MetricsResponse } from "@/lib/metrics/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_METRICS", resource: "metrics" },
    async () => {
      const { searchParams } = new URL(request.url);
      const data = await fetchMetricsSnapshot({
        preset: parseMetricsPreset(searchParams.get("preset")),
        from: searchParams.get("from"),
        to: searchParams.get("to"),
      });
      const body: MetricsResponse = { ok: true, data };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    },
  );
}
