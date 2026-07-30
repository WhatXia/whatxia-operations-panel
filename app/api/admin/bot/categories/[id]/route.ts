import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { deleteCategory, updateCategory } from "@/lib/bot-cms/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "BOT_CATEGORY_UPDATE",
      resource: "bot_category",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "edit",
    },
    async () => {
      const body = await request.json();
      try {
        const data = await updateCategory(id, body);
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: id,
          message: `Categoría actualizada ${data.code}`,
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
      action: "BOT_CATEGORY_DELETE",
      resource: "bot_category",
      resourceId: id,
      adminOnly: true,
      module: "bot_cms",
      level: "delete",
    },
    async () => {
      try {
        await deleteCategory(id);
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: id,
          message: "Categoría eliminada",
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
