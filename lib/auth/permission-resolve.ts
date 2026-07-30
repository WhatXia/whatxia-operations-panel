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
  passengers: "read",
  metrics: "read",
  system_status: "read",
  incidents: "read",
  conversations: "read",
  users: "none",
  roles: "none",
  configuration: "none",
  bot_cms: "none",
  ai: "none",
  integrations: "none",
  audit: "none",
  exports: "read",
};

const DEVELOPER_DEFAULT: Record<PermissionModule, PermissionLevel> = {
  dashboard: "read",
  services: "none",
  drivers: "none",
  passengers: "none",
  metrics: "none",
  system_status: "none",
  incidents: "none",
  conversations: "none",
  users: "none",
  roles: "none",
  configuration: "read",
  bot_cms: "admin",
  ai: "none",
  integrations: "none",
  audit: "read",
  exports: "none",
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

  if (isSuperAdminUser(user)) {
    return emptyPermissionMap("admin");
  }

  if (hasPermissionSnapshot(raw)) {
    const normalized = normalizePermissionMap(raw);
    // Módulos nuevos (p. ej. passengers) ausentes en JWT antiguo → defaults OPS.
    const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
    if (role === ROLES.OPS_ADMIN) {
      for (const module of Object.keys(OPS_DEFAULT) as PermissionModule[]) {
        if (
          raw &&
          typeof raw === "object" &&
          !(module in (raw as object))
        ) {
          normalized[module] = OPS_DEFAULT[module];
        }
      }
    }
    if (role === ROLES.DEVELOPER) {
      for (const module of Object.keys(DEVELOPER_DEFAULT) as PermissionModule[]) {
        if (
          raw &&
          typeof raw === "object" &&
          !(module in (raw as object))
        ) {
          normalized[module] = DEVELOPER_DEFAULT[module];
        }
      }
    }
    return normalized;
  }

  // Compatibilidad hasta que el JWT tenga snapshot sincronizado.
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  if (role === ROLES.OPS_ADMIN) {
    return { ...OPS_DEFAULT };
  }
  if (role === ROLES.DEVELOPER) {
    return { ...DEVELOPER_DEFAULT };
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
