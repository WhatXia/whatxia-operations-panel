import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deleteConversationTree,
  getConversationTreeDetail,
  publishConversationTree,
  updateConversationTree,
} from "@/lib/bot-cms/conversation-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_CONVERSATION_TREE",
      resource: "bot_conversation_tree",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const data = await getConversationTreeDetail(id);
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Error",
          },
          { status: 404 },
        );
      }
    },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const publish = body.publish === true || body.status === "PUBLISHED";

  return withAuditedApi(
    request,
    {
      action: publish
        ? "BOT_CONVERSATION_TREE_PUBLISH"
        : "BOT_CONVERSATION_TREE_UPDATE",
      resource: "bot_conversation_tree",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        const actor = { id: user.id, email: user.email };
        const data = publish
          ? await publishConversationTree(id, actor)
          : await updateConversationTree(id, body, actor);
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: publish
            ? `Árbol publicado ${data.code} v${data.version}`
            : `Árbol actualizado ${data.code}`,
          newValues: {
            status: data.status,
            version: data.version,
            name: data.name,
          },
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
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_TREE_DELETE",
      resource: "bot_conversation_tree",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "admin",
    },
    async () => {
      try {
        await deleteConversationTree(id);
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: id,
          message: "Árbol eliminado",
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
