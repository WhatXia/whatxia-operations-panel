/** Módulos y niveles de permiso del Operations Center */

export const PERMISSION_LEVELS = [
  "none",
  "read",
  "create",
  "edit",
  "delete",
  "admin",
] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Sin acceso",
  read: "Solo lectura",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
  admin: "Administrar",
};

export const PERMISSION_LEVEL_RANK: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  create: 2,
  edit: 3,
  delete: 4,
  admin: 5,
};

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "services", label: "Servicios" },
  { key: "drivers", label: "Conductores" },
  { key: "passengers", label: "Usuarios finales" },
  { key: "metrics", label: "Métricas" },
  { key: "system_status", label: "Estado del Sistema" },
  { key: "incidents", label: "Incidentes" },
  { key: "conversations", label: "Conversaciones" },
  { key: "users", label: "Usuarios Admin" },
  { key: "roles", label: "Roles" },
  { key: "configuration", label: "Configuración" },
  { key: "bot_cms", label: "Centro Conversacional Bot" },
  { key: "ai", label: "IA" },
  { key: "integrations", label: "Integraciones" },
  { key: "audit", label: "Auditoría" },
  { key: "exports", label: "Exportaciones" },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];

export type PermissionMap = Partial<Record<PermissionModule, PermissionLevel>>;

export function isPermissionLevel(value: unknown): value is PermissionLevel {
  return (
    typeof value === "string" &&
    (PERMISSION_LEVELS as readonly string[]).includes(value)
  );
}

export function isPermissionModule(value: unknown): value is PermissionModule {
  return (
    typeof value === "string" &&
    PERMISSION_MODULES.some((module) => module.key === value)
  );
}

export function levelAtLeast(
  current: PermissionLevel | null | undefined,
  required: PermissionLevel,
): boolean {
  const rank = PERMISSION_LEVEL_RANK[current ?? "none"] ?? 0;
  return rank >= PERMISSION_LEVEL_RANK[required];
}

export function emptyPermissionMap(
  level: PermissionLevel = "none",
): Record<PermissionModule, PermissionLevel> {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [module.key, level]),
  ) as Record<PermissionModule, PermissionLevel>;
}

export function normalizePermissionMap(
  input?: PermissionMap | null,
): Record<PermissionModule, PermissionLevel> {
  const base = emptyPermissionMap("none");
  if (!input) return base;
  for (const module of PERMISSION_MODULES) {
    const value = input[module.key];
    if (isPermissionLevel(value)) {
      base[module.key] = value;
    }
  }
  return base;
}

/** Módulo de permiso requerido para una ruta (páginas y APIs). */
export function permissionModuleForPath(pathname: string): PermissionModule | null {
  if (
    pathname.startsWith("/conversaciones") ||
    pathname.startsWith("/api/conversations")
  ) {
    return "conversations";
  }
  if (
    pathname.startsWith("/api/metrics/export") ||
    pathname === "/api/metrics/export"
  ) {
    return "exports";
  }
  if (pathname.startsWith("/admin/auditoria") || pathname.startsWith("/api/admin/audit")) {
    return "audit";
  }
  if (pathname.startsWith("/admin/usuarios") || pathname.startsWith("/api/admin/users")) {
    return "users";
  }
  if (
    pathname.startsWith("/usuarios") ||
    pathname.startsWith("/api/passengers")
  ) {
    return "passengers";
  }
  if (pathname.startsWith("/admin/roles") || pathname.startsWith("/api/admin/roles")) {
    return "roles";
  }
  if (pathname.startsWith("/admin/ia")) return "ai";
  if (pathname.startsWith("/admin/integraciones")) return "integrations";
  if (
    pathname.startsWith("/admin/bot") ||
    pathname.startsWith("/api/admin/bot")
  ) {
    return "bot_cms";
  }
  if (
    pathname.startsWith("/admin/configuracion") ||
    pathname.startsWith("/admin/parametros") ||
    pathname === "/admin"
  ) {
    return "configuration";
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return "configuration";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/dashboard")) {
    return "dashboard";
  }
  if (pathname.startsWith("/servicios") || pathname.startsWith("/api/services")) {
    return "services";
  }
  if (pathname.startsWith("/conductores") || pathname.startsWith("/api/drivers")) {
    return "drivers";
  }
  if (pathname.startsWith("/metricas") || pathname.startsWith("/api/metrics")) {
    return "metrics";
  }
  if (
    pathname.startsWith("/estado-sistema") ||
    pathname.startsWith("/api/system-status")
  ) {
    return "system_status";
  }
  if (pathname.startsWith("/incidentes")) return "incidents";
  return null;
}

export function minLevelForRequest(
  pathname: string,
  method: string,
): PermissionLevel {
  const upper = method.toUpperCase();
  if (pathname.startsWith("/api/")) {
    if (upper === "GET" || upper === "HEAD") return "read";
    if (upper === "POST") return "create";
    if (upper === "PATCH" || upper === "PUT") return "edit";
    if (upper === "DELETE") return "delete";
  }
  return "read";
}
