import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  listConversationTreeVersions,
  restoreConversationTreeVersion,
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
      action: "VIEW_BOT_CONVERSATION_VERSIONS",
      resource: "bot_conversation_tree",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const data = await listConversationTreeVersions(id);
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Error",
          },
          { status: 500 },
        );
      }
    },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_TREE_RESTORE",
      resource: "bot_conversation_tree",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        const data = await restoreConversationTreeVersion(
          id,
          String(body.versionId),
          { id: user.id, email: user.email },
        );
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: `Árbol restaurado a versión previa → v${data.version}`,
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
