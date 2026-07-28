import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { exportMetrics } from "@/lib/metrics/export";
import type { MetricsExportFormat } from "@/lib/metrics/export/types";
import { parseMetricsPreset } from "@/lib/metrics/ranges";
import { fetchMetricsSnapshot } from "@/lib/metrics/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuditedApi(
    request,
    { action: "EXPORT_DATA", resource: "metrics" },
    async () => {
      const body = (await request.json()) as {
        format?: MetricsExportFormat;
        preset?: string;
        from?: string;
        to?: string;
      };

      const format = body.format === "pdf" ? "pdf" : "excel";
      const snapshot = await fetchMetricsSnapshot({
        preset: parseMetricsPreset(body.preset ?? null),
        from: body.from,
        to: body.to,
      });

      const result = await exportMetrics({ format, snapshot });
      return NextResponse.json(result);
    },
  );
}
