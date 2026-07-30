import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deleteConversationNode,
  updateConversationNode,
} from "@/lib/bot-cms/conversation-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; nodeId: string }> },
) {
  const { id, nodeId } = await context.params;
  const body = await request.json();
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_NODE_UPDATE",
      resource: "bot_conversation_node",
      resourceId: nodeId,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        const data = await updateConversationNode(id, nodeId, body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: nodeId,
          message: `Nodo actualizado ${data.code}`,
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
  context: { params: Promise<{ id: string; nodeId: string }> },
) {
  const { id, nodeId } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_NODE_DELETE",
      resource: "bot_conversation_node",
      resourceId: nodeId,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        await deleteConversationNode(id, nodeId, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: nodeId,
          message: "Nodo eliminado",
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
