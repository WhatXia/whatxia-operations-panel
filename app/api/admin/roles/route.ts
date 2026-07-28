import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  createRole,
  listRolesWithMeta,
} from "@/lib/auth/roles-service";
import type { PermissionMap } from "@/lib/auth/permission-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "LIST_ROLES",
      resource: "roles",
      adminOnly: true,
      module: "roles",
      level: "read",
    },
    async () => {
      try {
        const data = await listRolesWithMeta();
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al listar roles. ¿Aplicaste la migración 002?",
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
      action: "ROLE_CREATE",
      resource: "role",
      adminOnly: true,
      module: "roles",
      level: "admin",
    },
    async () => {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
        code?: string;
        permissions?: PermissionMap;
      };

      try {
        const role = await createRole({
          name: body.name ?? "",
          description: body.description,
          code: body.code,
          permissions: body.permissions,
        });
        return {
          response: NextResponse.json({ ok: true, data: role }),
          resourceId: role.id,
          message: `Rol creado: ${role.code}`,
          newValues: {
            code: role.code,
            name: role.name,
            permissions: role.permissions,
          },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Error al crear rol",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
