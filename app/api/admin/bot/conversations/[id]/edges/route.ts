import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deleteConversationEdge,
  upsertConversationEdge,
} from "@/lib/bot-cms/conversation-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_EDGE_UPSERT",
      resource: "bot_conversation_edge",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        const data = await upsertConversationEdge(id, body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: "Conexión guardada",
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Error",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const edgeId = searchParams.get("edgeId");
  if (!edgeId) {
    return NextResponse.json(
      { ok: false, error: "edgeId requerido" },
      { status: 400 },
    );
  }
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_EDGE_DELETE",
      resource: "bot_conversation_edge",
      resourceId: edgeId,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        await deleteConversationEdge(id, edgeId, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: edgeId,
          message: "Conexión eliminada",
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Error",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
