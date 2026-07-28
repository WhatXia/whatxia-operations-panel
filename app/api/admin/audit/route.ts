import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { queryAuditLogs } from "@/lib/audit/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_AUDIT", resource: "audit_logs", adminOnly: true },
    async () => {
      const { searchParams } = new URL(request.url);
      const data = await queryAuditLogs({
        userEmail: searchParams.get("user"),
        module: searchParams.get("module"),
        action: searchParams.get("action"),
        result: (searchParams.get("result") as "OK" | "ERROR" | null) || null,
        from: searchParams.get("from"),
        to: searchParams.get("to"),
        q: searchParams.get("q"),
        sort: searchParams.get("sort") === "oldest" ? "oldest" : "newest",
        limit: Number(searchParams.get("limit") || 100),
      });

      return NextResponse.json({ ok: true, data });
    },
  );
}
