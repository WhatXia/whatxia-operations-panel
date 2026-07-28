import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { listConversationsByDriver } from "@/lib/conversations/history";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_DRIVER_CONVERSATIONS",
      resource: "driver_conversations",
      resourceId: id,
      module: "drivers",
      level: "read",
    },
    async () => {
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "ID inválido" },
          { status: 400 },
        );
      }

      try {
        const data = await listConversationsByDriver(id);
        return NextResponse.json(
          { ok: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al listar conversaciones";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
      }
    },
  );
}
