import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  getRoleById,
  getRolePermissions,
  replaceRolePermissions,
} from "@/lib/auth/roles-service";
import {
  normalizePermissionMap,
  type PermissionMap,
} from "@/lib/auth/permission-catalog";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "PERMISSION_CHANGE",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "admin",
    },
    async () => {
      const body = (await request.json()) as {
        permissions?: PermissionMap;
      };

      try {
        const role = await getRoleById(id);
        if (!role) {
          return {
            response: NextResponse.json(
              { ok: false, error: "Rol no encontrado" },
              { status: 404 },
            ),
          };
        }

        const oldPermissions = await getRolePermissions(id);
        const next = normalizePermissionMap(body.permissions);
        await replaceRolePermissions(id, next);

        return {
          response: NextResponse.json({
            ok: true,
            data: { id, permissions: next },
          }),
          resourceId: id,
          message: `Permisos actualizados: ${role.code}`,
          oldValues: oldPermissions,
          newValues: next,
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Error al guardar permisos",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
