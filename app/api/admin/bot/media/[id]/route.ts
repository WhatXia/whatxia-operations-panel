import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { deleteMedia, updateMedia } from "@/lib/bot-cms/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "BOT_MEDIA_UPDATE",
      resource: "bot_media",
      resourceId: id,
      adminOnly: true,
      module: "configuration",
      level: "edit",
    },
    async () => {
      const body = await request.json();
      try {
        const data = await updateMedia(id, body);
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: `Multimedia actualizada ${data.name}`,
          newValues: body,
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
      action: "BOT_MEDIA_DELETE",
      resource: "bot_media",
      resourceId: id,
      adminOnly: true,
      module: "configuration",
      level: "delete",
    },
    async () => {
      try {
        await deleteMedia(id);
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: id,
          message: "Multimedia eliminada",
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
