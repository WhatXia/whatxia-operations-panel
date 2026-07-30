import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  createConversationTree,
  listConversationTrees,
} from "@/lib/bot-cms/conversation-service";
import { isBotAudience } from "@/lib/bot-cms/conversation-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_CONVERSATION_TREES",
      resource: "bot_conversation_trees",
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const data = await listConversationTrees({
          audience: searchParams.get("audience") ?? undefined,
          status: searchParams.get("status") ?? undefined,
          q: searchParams.get("q") ?? undefined,
        });
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al listar conversaciones. ¿Migración 010 aplicada?",
          },
          { status: 500 },
        );
      }
    },
  );
}

export async function POST(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "BOT_CONVERSATION_TREE_CREATE",
      resource: "bot_conversation_tree",
      adminOnly: true,
      module: "bot_cms",
      level: "create",
    },
    async ({ user }) => {
      const body = await request.json();
      try {
        if (!isBotAudience(body.audience)) {
          return {
            response: NextResponse.json(
              { ok: false, error: "Audiencia inválida" },
              { status: 400 },
            ),
          };
        }
        const data = await createConversationTree(body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: `Árbol creado ${data.code}`,
          newValues: { code: data.code, audience: data.audience },
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
