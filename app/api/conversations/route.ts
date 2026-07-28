import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { filtersFromSearchParams } from "@/lib/conversations/filters";
import { fetchConversationsList } from "@/lib/conversations/queries";
import type { ConversationsListResponse } from "@/lib/conversations/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_CONVERSATIONS",
      resource: "conversations",
      module: "conversations",
      level: "read",
    },
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const filters = filtersFromSearchParams(searchParams);
        const data = await fetchConversationsList(filters);
        const body: ConversationsListResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const body: ConversationsListResponse = {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al listar conversaciones",
        };
        return NextResponse.json(body, { status: 500 });
      }
    },
  );
}
