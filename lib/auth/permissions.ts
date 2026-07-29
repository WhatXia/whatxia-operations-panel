import {
  levelAtLeast,
  permissionModuleForPath,
  minLevelForRequest,
  type PermissionLevel,
  type PermissionModule,
} from "@/lib/auth/permission-catalog";
import {
  isSuperAdminUser,
  permissionsFromUser,
} from "@/lib/auth/permission-resolve";
import { ROLES } from "@/lib/auth/roles";

export const OPS_ROUTES = [
  "/dashboard",
  "/servicios",
  "/conductores",
  "/usuarios",
  "/incidentes",
  "/metricas",
  "/estado-sistema",
  "/conversaciones",
] as const;

export const ADMIN_ROUTES = [
  "/admin",
  "/admin/usuarios",
  "/admin/roles",
  "/admin/auditoria",
  "/admin/configuracion",
  "/admin/bot",
  "/admin/ia",
  "/admin/integraciones",
  "/admin/parametros",
] as const;

export function pathStartsWith(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isOpsPath(pathname: string) {
  return OPS_ROUTES.some((route) => pathStartsWith(pathname, route));
}

export function isAdminPath(pathname: string) {
  return pathStartsWith(pathname, "/admin");
}

export function isProtectedApiPath(pathname: string) {
  return pathStartsWith(pathname, "/api/");
}

export function isAdminApiPath(pathname: string) {
  return pathStartsWith(pathname, "/api/admin");
}

export type AccessSubject = {
  role?: string | null;
  isSuperAdmin?: boolean;
  permissions?: Partial<Record<PermissionModule, PermissionLevel>> | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function subjectIsSuper(subject: AccessSubject): boolean {
  if (!subject) return false;
  if (subject.isSuperAdmin) return true;
  if (isSuperAdminUser(subject)) return true;
  return subject.role === ROLES.SUPERADMIN;
}

function subjectPermissions(subject: AccessSubject) {
  if (subject?.permissions) {
    return subject.permissions;
  }
  return permissionsFromUser(subject);
}

/**
 * Compatibilidad:
 * - Superadmin → todo
 * - Si hay mapa de permisos en JWT → matriz
 * - Legacy OPS_ADMIN sin mapa → ops sí / admin no
 */
export function canAccessPath(
  subject: AccessSubject | string | null,
  pathname: string,
  method = "GET",
): boolean {
  // Firma legacy: canAccessPath(roleCode, path)
  const normalized: AccessSubject =
    typeof subject === "string" || subject === null
      ? { role: subject }
      : subject;

  const isAdminTarget = isAdminPath(pathname) || isAdminApiPath(pathname);
  const role = normalized?.role ?? null;

  if (!role && !normalized?.permissions) {
    if (isAdminTarget) return false;
    if (isOpsPath(pathname)) return true;
    if (
      pathStartsWith(pathname, "/api/dashboard") ||
      pathStartsWith(pathname, "/api/services") ||
      pathStartsWith(pathname, "/api/drivers") ||
      pathStartsWith(pathname, "/api/metrics") ||
      pathStartsWith(pathname, "/api/system-status") ||
      pathStartsWith(pathname, "/api/conversations") ||
      pathStartsWith(pathname, "/api/passengers")
    ) {
      return true;
    }
    return !pathStartsWith(pathname, "/api/admin");
  }

  if (subjectIsSuper(normalized)) return true;

  const module = permissionModuleForPath(pathname);
  const permissions = subjectPermissions(normalized);
  const hasPermissionMap =
    normalized?.permissions != null ||
    (normalized?.app_metadata?.permissions != null);

  if (module && hasPermissionMap) {
    const required = minLevelForRequest(pathname, method);
    const level = permissions[module] ?? "none";
    return levelAtLeast(level, required);
  }

  // Legacy path rules
  if (isAdminTarget) {
    return role === ROLES.SUPERADMIN;
  }

  if (
    isOpsPath(pathname) ||
    pathStartsWith(pathname, "/api/dashboard") ||
    pathStartsWith(pathname, "/api/services") ||
    pathStartsWith(pathname, "/api/drivers") ||
    pathStartsWith(pathname, "/api/metrics") ||
    pathStartsWith(pathname, "/api/system-status") ||
    pathStartsWith(pathname, "/api/conversations") ||
    pathStartsWith(pathname, "/api/passengers")
  ) {
    return role === ROLES.SUPERADMIN || role === ROLES.OPS_ADMIN;
  }

  return true;
}

export function userHasPermission(
  subject: AccessSubject,
  module: PermissionModule,
  required: PermissionLevel = "read",
): boolean {
  if (subjectIsSuper(subject)) return true;
  const permissions = subjectPermissions(subject);
  return levelAtLeast(permissions[module] ?? "none", required);
}

export function moduleFromPath(pathname: string): string {
  const module = permissionModuleForPath(pathname);
  if (module) return module;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return "auth";
  }
  return "sistema";
}
