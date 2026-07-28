import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { duplicateRole } from "@/lib/auth/roles-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "ROLE_DUPLICATE",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "create",
    },
    async () => {
      try {
        const role = await duplicateRole(id);
        return {
          response: NextResponse.json({ ok: true, data: role }),
          resourceId: role.id,
          message: `Rol duplicado → ${role.code}`,
          newValues: { code: role.code, name: role.name },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : "Error al duplicar",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
