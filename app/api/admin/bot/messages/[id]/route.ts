import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deleteMessage,
  getMessageDetail,
  updateMessage,
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
      action: "VIEW_BOT_MESSAGE",
      resource: "bot_message",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const data = await getMessageDetail(id);
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

  let action = "BOT_MESSAGE_UPDATE";
  if (typeof body.is_active === "boolean") {
    action = body.is_active ? "BOT_MESSAGE_ACTIVATE" : "BOT_MESSAGE_DEACTIVATE";
  } else if (body.status === "PUBLISHED") {
    action = "BOT_MESSAGE_PUBLISH";
  } else if (body.status === "DRAFT") {
    action = "BOT_MESSAGE_UNPUBLISH";
  }

  return withAuditedApi(
    request,
    {
      action,
      resource: "bot_message",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async ({ user }) => {
      try {
        const before = await getMessageDetail(id);
        const data = await updateMessage(id, body, {
          id: user.id,
          email: user.email,
        });
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: `Mensaje actualizado ${data.code} v${data.version}`,
          oldValues: {
            body: before.body,
            status: before.status,
            name: before.name,
            version: before.version,
            is_active: before.is_active,
          },
          newValues: {
            body: data.body,
            status: data.status,
            name: data.name,
            version: data.version,
            is_active: data.is_active,
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
      action: "BOT_MESSAGE_DELETE",
      resource: "bot_message",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "delete",
    },
    async () => {
      try {
        const before = await getMessageDetail(id);
        await deleteMessage(id);
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: id,
          message: `Mensaje eliminado ${before.code}`,
          oldValues: { code: before.code, name: before.name },
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
