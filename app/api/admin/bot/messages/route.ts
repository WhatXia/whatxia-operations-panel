import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { createMessage, listMessages } from "@/lib/bot-cms/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_MESSAGES",
      resource: "bot_messages",
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const data = await listMessages({
          q: searchParams.get("q") ?? undefined,
          categoryId: searchParams.get("categoryId") ?? undefined,
          status: searchParams.get("status") ?? undefined,
          tag: searchParams.get("tag") ?? undefined,
          environment: searchParams.get("environment") ?? undefined,
          module: searchParams.get("module") ?? undefined,
        });
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al listar mensajes. ¿Migración 004 aplicada?",
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
      action: "BOT_MESSAGE_CREATE",
      resource: "bot_message",
      adminOnly: true,
      module: "bot_cms",
      level: "create",
    },
    async ({ user }) => {
      const body = await request.json();
      try {
        const data = await createMessage(body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: `Mensaje creado ${data.code}`,
          newValues: { code: data.code, name: data.name, status: data.status },
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
