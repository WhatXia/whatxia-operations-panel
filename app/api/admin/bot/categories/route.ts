import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { listCategories, createCategory } from "@/lib/bot-cms/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_CATEGORIES",
      resource: "bot_categories",
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const data = await listCategories();
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al listar categorías. ¿Migración 004 aplicada?",
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
      action: "BOT_CATEGORY_CREATE",
      resource: "bot_category",
      adminOnly: true,
      module: "bot_cms",
      level: "create",
    },
    async () => {
      const body = await request.json();
      try {
        const data = await createCategory(body);
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: `Categoría creada ${data.code}`,
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
