import {
  emptyPermissionMap,
  normalizePermissionMap,
  type PermissionLevel,
  type PermissionMap,
  type PermissionModule,
} from "@/lib/auth/permission-catalog";
import { ROLES } from "@/lib/auth/roles";

const OPS_DEFAULT: Record<PermissionModule, PermissionLevel> = {
  dashboard: "read",
  services: "edit",
  drivers: "edit",
  metrics: "read",
  system_status: "read",
  incidents: "edit",
  conversations: "read",
  users: "none",
  roles: "none",
  configuration: "none",
  ai: "none",
  integrations: "none",
  audit: "none",
  exports: "read",
};

function hasPermissionSnapshot(raw: unknown): raw is PermissionMap {
  return Boolean(raw && typeof raw === "object" && Object.keys(raw as object).length > 0);
}

/** Resuelve permisos efectivos desde JWT / metadata (sin DB). */
export function permissionsFromUser(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined): Record<PermissionModule, PermissionLevel> {
  const raw = user?.app_metadata?.permissions;
  if (hasPermissionSnapshot(raw)) {
    return normalizePermissionMap(raw);
  }

  // Compatibilidad hasta que el JWT tenga snapshot sincronizado.
  if (isSuperAdminUser(user)) {
    return emptyPermissionMap("admin");
  }

  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  if (role === ROLES.OPS_ADMIN) {
    return { ...OPS_DEFAULT };
  }

  return emptyPermissionMap("none");
}

export function isSuperAdminUser(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.is_superadmin === true) return true;
  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  return role === ROLES.SUPERADMIN;
}
