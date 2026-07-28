import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, getRoleFromUser, roleLabel, type AppRole } from "@/lib/auth/roles";
import { setUserRole } from "@/lib/auth/ensure-role";
import {
  countSuperAdminUsers,
  getRoleByCode,
  listRoles,
} from "@/lib/auth/roles-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "LIST_USERS",
      resource: "users",
      adminOnly: true,
      module: "users",
      level: "read",
    },
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      let roleNames = new Map<string, string>();
      try {
        const roles = await listRoles();
        roleNames = new Map(roles.map((role) => [role.code, role.name]));
      } catch {
        // Migración pendiente
      }

      const users = (data.users ?? []).map((user) => {
        const role = getRoleFromUser(user);
        const metaName =
          typeof user.app_metadata?.role_name === "string"
            ? user.app_metadata.role_name
            : null;
        return {
          id: user.id,
          email: user.email,
          role,
          roleLabel: roleLabel(role, metaName ?? roleNames.get(role ?? "")),
          lastSignInAt: user.last_sign_in_at,
          createdAt: user.created_at,
        };
      });

      return NextResponse.json({ ok: true, data: users });
    },
  );
}

export async function POST(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "CREATE_USER",
      resource: "user",
      adminOnly: true,
      module: "users",
      level: "create",
    },
    async ({ user: actor }) => {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        role?: AppRole;
      };

      const email = body.email?.trim().toLowerCase();
      const password = body.password ?? "";
      const roleCode = (body.role ?? ROLES.OPS_ADMIN).trim();

      if (!email || password.length < 8) {
        return NextResponse.json(
          { ok: false, error: "Email y contraseña (mín. 8) requeridos" },
          { status: 400 },
        );
      }

      let roleMeta: {
        role: string;
        role_id?: string;
        role_name?: string;
        is_superadmin?: boolean;
        permissions?: Record<string, string>;
      } = {
        role: roleCode,
        is_superadmin: roleCode === ROLES.SUPERADMIN,
      };

      try {
        const dbRole = await getRoleByCode(roleCode);
        if (dbRole) {
          const { getRolePermissions } = await import("@/lib/auth/roles-service");
          const permissions = await getRolePermissions(dbRole.id);
          roleMeta = {
            role: dbRole.code,
            role_id: dbRole.id,
            role_name: dbRole.name,
            is_superadmin: dbRole.is_superadmin,
            permissions,
          };
        }
      } catch {
        // legacy
      }

      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: roleMeta,
      });

      if (error || !data.user) {
        return {
          response: NextResponse.json(
            { ok: false, error: error?.message || "No se pudo crear usuario" },
            { status: 400 },
          ),
        };
      }

      return {
        response: NextResponse.json({
          ok: true,
          data: {
            id: data.user.id,
            email: data.user.email,
            role: roleMeta.role,
            createdBy: actor.email,
          },
        }),
        resourceId: data.user.id,
        message: `Usuario creado (${roleMeta.role})`,
        newValues: { email, role: roleMeta.role },
      };
    },
  );
}

export async function PATCH(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "ROLE_CHANGE",
      resource: "user",
      adminOnly: true,
      module: "users",
      level: "edit",
    },
    async () => {
      const body = (await request.json()) as {
        userId?: string;
        role?: AppRole;
      };

      if (!body.userId || !body.role?.trim()) {
        return {
          response: NextResponse.json(
            { ok: false, error: "userId y role válidos requeridos" },
            { status: 400 },
          ),
        };
      }

      const admin = createAdminClient();
      const { data: current } = await admin.auth.admin.getUserById(body.userId);
      const oldRole = getRoleFromUser(current.user);

      try {
        const nextRole = await getRoleByCode(body.role);
        const prevIsSuper =
          oldRole === ROLES.SUPERADMIN ||
          current.user?.app_metadata?.is_superadmin === true;
        const nextIsSuper = nextRole?.is_superadmin || body.role === ROLES.SUPERADMIN;

        if (prevIsSuper && !nextIsSuper) {
          const count = await countSuperAdminUsers();
          if (count <= 1) {
            return {
              response: NextResponse.json(
                {
                  ok: false,
                  error:
                    "Debe existir al menos un Superadministrador en el sistema",
                },
                { status: 400 },
              ),
            };
          }
        }
      } catch {
        // ignore if tables missing
      }

      const updated = await setUserRole(body.userId, body.role.trim());

      return {
        response: NextResponse.json({
          ok: true,
          data: {
            id: updated.id,
            email: updated.email,
            oldRole,
            role: body.role,
          },
        }),
        resourceId: updated.id,
        message: `Cambio de rol ${oldRole ?? "null"} → ${body.role}`,
        oldValues: { role: oldRole },
        newValues: { role: body.role, email: updated.email },
      };
    },
  );
}

export async function DELETE(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "DELETE_USER",
      resource: "user",
      adminOnly: true,
      module: "users",
      level: "delete",
    },
    async ({ user: actor }) => {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: "userId requerido" },
          { status: 400 },
        );
      }
      if (userId === actor.id) {
        return NextResponse.json(
          { ok: false, error: "No puedes eliminar tu propio usuario" },
          { status: 400 },
        );
      }

      const admin = createAdminClient();
      const { data: current } = await admin.auth.admin.getUserById(userId);
      const role = getRoleFromUser(current.user);
      if (
        role === ROLES.SUPERADMIN ||
        current.user?.app_metadata?.is_superadmin === true
      ) {
        try {
          const count = await countSuperAdminUsers();
          if (count <= 1) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  "No se puede eliminar el último Superadministrador",
              },
              { status: 400 },
            );
          }
        } catch {
          // continue
        }
      }

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    },
  );
}
