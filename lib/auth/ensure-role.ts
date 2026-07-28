import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRoleByCode,
  getRolePermissions,
  syncUserMetadataFromRoleCode,
} from "@/lib/auth/roles-service";
import {
  ROLES,
  getRoleFromUser,
  type AppRole,
} from "@/lib/auth/roles";
import type { User } from "@supabase/supabase-js";

function superadminEmails(): string[] {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Garantiza un rol en app_metadata.
 * - SUPERADMIN_EMAILS → SUPERADMIN
 * - resto sin rol → OPS_ADMIN
 * Sincroniza permisos desde app_roles cuando exista la tabla.
 */
export async function ensureUserRole(user: User): Promise<AppRole> {
  const existing = getRoleFromUser(user);
  if (existing) {
    // Refrescar snapshot de permisos si falta.
    if (!user.app_metadata?.permissions || user.app_metadata?.role_id == null) {
      try {
        await syncUserMetadataFromRoleCode(user.id, existing);
      } catch (error) {
        console.error("[auth] sync permissions failed:", error);
      }
    }
    return existing;
  }

  const email = user.email?.toLowerCase() ?? "";
  const role: AppRole = superadminEmails().includes(email)
    ? ROLES.SUPERADMIN
    : ROLES.OPS_ADMIN;

  try {
    await syncUserMetadataFromRoleCode(user.id, role);
    return role;
  } catch (error) {
    // Fallback sin tablas de roles (migración pendiente).
    console.error("[auth] ensureUserRole DB sync failed, using legacy:", error);
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        role,
        is_superadmin: role === ROLES.SUPERADMIN,
      },
    });
    return role;
  }
}

export async function setUserRole(
  userId: string,
  role: AppRole,
): Promise<User> {
  const dbRole = await getRoleByCode(role);
  if (dbRole) {
    const { assignUserToRole } = await import("@/lib/auth/roles-service");
    await assignUserToRole({ userId, roleId: dbRole.id });
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      throw new Error(error?.message || "Usuario no encontrado");
    }
    return data.user;
  }

  // Legacy si el rol aún no está en DB
  const admin = createAdminClient();
  const { data: current, error: getError } =
    await admin.auth.admin.getUserById(userId);
  if (getError || !current.user) {
    throw new Error(getError?.message || "Usuario no encontrado");
  }

  const permissions = await getRolePermissionsSafe(role);
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(current.user.app_metadata ?? {}),
      role,
      is_superadmin: role === ROLES.SUPERADMIN,
      permissions,
      role_name: role,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "No se pudo actualizar el rol");
  }

  return data.user;
}

async function getRolePermissionsSafe(roleCode: string) {
  try {
    const role = await getRoleByCode(roleCode);
    if (!role) return undefined;
    return await getRolePermissions(role.id);
  } catch {
    return undefined;
  }
}
