import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { getAuditLogById } from "@/lib/audit/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_AUDIT",
      resource: "audit_log",
      resourceId: id,
      adminOnly: true,
    },
    async () => {
      const data = await getAuditLogById(id);
      if (!data) {
        return NextResponse.json(
          { ok: false, error: "Evento no encontrado" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, data });
    },
  );
}
