import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  assignUserToRole,
  getRoleById,
  listUsersWithRoleCode,
  removeUserFromRole,
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
      action: "LIST_ROLE_USERS",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "read",
    },
    async () => {
      const role = await getRoleById(id);
      if (!role) {
        return NextResponse.json(
          { ok: false, error: "Rol no encontrado" },
          { status: 404 },
        );
      }
      const users = await listUsersWithRoleCode(role.code);
      return NextResponse.json({
        ok: true,
        data: { users, userCount: users.length },
      });
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
      action: "ROLE_ASSIGN_USER",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "edit",
    },
    async () => {
      const body = (await request.json()) as { userId?: string };
      if (!body.userId) {
        return {
          response: NextResponse.json(
            { ok: false, error: "userId requerido" },
            { status: 400 },
          ),
        };
      }

      try {
        const role = await getRoleById(id);
        await assignUserToRole({ userId: body.userId, roleId: id });
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: body.userId,
          message: `Usuario asignado a ${role?.code ?? id}`,
          newValues: { userId: body.userId, roleId: id, roleCode: role?.code },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : "Error al asignar",
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
      action: "ROLE_REMOVE_USER",
      resource: "role",
      resourceId: id,
      adminOnly: true,
      module: "roles",
      level: "edit",
    },
    async () => {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId) {
        return {
          response: NextResponse.json(
            { ok: false, error: "userId requerido" },
            { status: 400 },
          ),
        };
      }

      try {
        const role = await getRoleById(id);
        await removeUserFromRole({ userId, roleId: id });
        return {
          response: NextResponse.json({ ok: true }),
          resourceId: userId,
          message: `Usuario removido de ${role?.code ?? id}`,
          oldValues: { userId, roleId: id, roleCode: role?.code },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : "Error al quitar",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
