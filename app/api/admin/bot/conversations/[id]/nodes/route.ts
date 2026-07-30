import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { createConversationNode } from "@/lib/bot-cms/conversation-service";

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
      action: "BOT_CONVERSATION_NODE_CREATE",
      resource: "bot_conversation_node",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "create",
    },
    async ({ user }) => {
      try {
        const data = await createConversationNode(id, body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: `Nodo creado ${data.code}`,
          newValues: { code: data.code, name: data.name },
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
