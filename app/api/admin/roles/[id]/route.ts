import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deleteRole,
  getRoleById,
  getRolePermissions,
  listUsersWithRoleCode,
  updateRole,
} from "@/lib/auth/roles-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "VIEW_ROLE",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "read",
    },
    async () => {
      try {
        const role = await getRoleById(id);
        if (!role) {
          return NextResponse.json(
            { ok: false, error: "Rol no encontrado" },
            { status: 404 },
          );
        }
        const [permissions, users] = await Promise.all([
          getRolePermissions(role.id),
          listUsersWithRoleCode(role.code),
        ]);
        return NextResponse.json({
          ok: true,
          data: { ...role, permissions, users, userCount: users.length },
        });
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuditedApi(
    request,
    {
      action: "ROLE_UPDATE",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "edit",
    },
    async () => {
      const body = (await request.json()) as {
        name?: string;
        description?: string | null;
        is_active?: boolean;
      };

      try {
        const before = await getRoleById(id);
        const role = await updateRole(id, body);
        return {
          response: NextResponse.json({ ok: true, data: role }),
          resourceId: role.id,
          message: `Rol actualizado: ${role.code}`,
          oldValues: before
            ? {
                name: before.name,
                description: before.description,
                is_active: before.is_active,
              }
            : null,
          newValues: {
            name: role.name,
            description: role.description,
            is_active: role.is_active,
          },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : "Error al actualizar",
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
      action: "ROLE_DELETE",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "delete",
    },
    async () => {
      try {
        const before = await getRoleById(id);
        await deleteRole(id);
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: id,
          message: `Rol eliminado: ${before?.code ?? id}`,
          oldValues: before
            ? { code: before.code, name: before.name }
            : null,
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : "Error al eliminar",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
