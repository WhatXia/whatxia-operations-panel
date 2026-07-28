import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { fetchConversationHistoryDetail } from "@/lib/conversations/history";

export const dynamic = "force-dynamic";

/**
 * Detalle de historial reutilizable (conversationId = tripId).
 * Usado desde Conductores; listo para Usuarios/Servicios.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_CONVERSATION_HISTORY",
      resource: "conversation_history",
      resourceId: id,
      module: "conversations",
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
        const data = await fetchConversationHistoryDetail(id);
        return NextResponse.json(
          { ok: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar conversación";
        const status = message.includes("no encontrada") ? 404 : 500;
        return NextResponse.json({ ok: false, error: message }, { status });
      }
    },
  );
}
