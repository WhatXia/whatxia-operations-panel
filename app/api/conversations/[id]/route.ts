import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { fetchConversationDetail } from "@/lib/conversations/queries";
import type { ConversationDetailResponse } from "@/lib/conversations/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_CONVERSATION",
      resource: "conversation",
      resourceId: id,
      module: "conversations",
      level: "read",
    },
    async () => {
      try {
        if (!id) {
          const body: ConversationDetailResponse = {
            ok: false,
            error: "ID inválido",
          };
          return NextResponse.json(body, { status: 400 });
        }
        const data = await fetchConversationDetail(id);
        const body: ConversationDetailResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al inspeccionar";
        const status = message.includes("no encontrado") ? 404 : 500;
        const body: ConversationDetailResponse = { ok: false, error: message };
        return NextResponse.json(body, { status });
      }
    },
  );
}
