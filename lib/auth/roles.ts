/** Códigos de rol de sistema (compatibilidad). */
export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  OPS_ADMIN: "OPS_ADMIN",
} as const;

export type SystemRole = (typeof ROLES)[keyof typeof ROLES];

/** Cualquier código de rol (sistema o personalizado). */
export type AppRole = string;

export const ROLE_LABELS: Record<SystemRole, string> = {
  SUPERADMIN: "Superadministrador",
  OPS_ADMIN: "Administrador de Operaciones",
};

export function isSystemRole(value: unknown): value is SystemRole {
  return value === ROLES.SUPERADMIN || value === ROLES.OPS_ADMIN;
}

/** @deprecated Prefer isSystemRole; se mantiene para código legacy. */
export function isAppRole(value: unknown): value is SystemRole {
  return isSystemRole(value);
}

export function getRoleFromUser(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  email?: string | null;
} | null | undefined): AppRole | null {
  if (!user) return null;

  const fromApp = user.app_metadata?.role;
  if (typeof fromApp === "string" && fromApp.trim()) return fromApp.trim();

  const fromUser = user.user_metadata?.role;
  if (typeof fromUser === "string" && fromUser.trim()) return fromUser.trim();

  return null;
}

export function isSuperAdmin(
  roleOrUser:
    | AppRole
    | null
    | undefined
    | {
        app_metadata?: Record<string, unknown> | null;
        user_metadata?: Record<string, unknown> | null;
      },
): boolean {
  if (roleOrUser == null) return false;
  if (typeof roleOrUser === "string") {
    return roleOrUser === ROLES.SUPERADMIN;
  }
  if (roleOrUser.app_metadata?.is_superadmin === true) return true;
  const role = getRoleFromUser(roleOrUser);
  return role === ROLES.SUPERADMIN;
}

export function isOpsAdmin(role: AppRole | null | undefined): boolean {
  return role === ROLES.OPS_ADMIN || role === ROLES.SUPERADMIN;
}

export function roleLabel(
  code: string | null | undefined,
  fallbackName?: string | null,
) {
  if (!code) return "Sin rol";
  if (fallbackName) return fallbackName;
  if (code === ROLES.SUPERADMIN) return ROLE_LABELS.SUPERADMIN;
  if (code === ROLES.OPS_ADMIN) return ROLE_LABELS.OPS_ADMIN;
  return code;
}
