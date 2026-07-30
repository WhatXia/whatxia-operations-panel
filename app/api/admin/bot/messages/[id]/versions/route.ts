import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  listMessageVersions,
  restoreMessageVersion,
} from "@/lib/bot-cms/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_MESSAGE_VERSIONS",
      resource: "bot_message",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const data = await listMessageVersions(id);
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
  return withAuditedApi(
    request,
    {
      action: "BOT_MESSAGE_RESTORE",
      resource: "bot_message",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      const body = (await request.json()) as { versionId?: string };
      if (!body.versionId) {
        return {
          response: NextResponse.json(
            { ok: false, error: "versionId requerido" },
            { status: 400 },
          ),
        };
      }
      try {
        const data = await restoreMessageVersion(id, body.versionId, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: `Versión restaurada → v${data.version}`,
          newValues: { version: data.version, body: data.body },
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
