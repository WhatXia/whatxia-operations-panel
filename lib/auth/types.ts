import {
  getRoleFromUser,
  isSuperAdmin,
  roleLabel,
  type AppRole,
} from "@/lib/auth/roles";
import {
  permissionsFromUser,
  isSuperAdminUser,
} from "@/lib/auth/permission-resolve";
import type {
  PermissionLevel,
  PermissionModule,
} from "@/lib/auth/permission-catalog";
import { userHasPermission } from "@/lib/auth/permissions";

export type AuthUserView = {
  name: string;
  email: string;
  initials: string;
  role: AppRole | null;
  roleLabel: string;
  isSuperAdmin: boolean;
  permissions: Partial<Record<PermissionModule, PermissionLevel>>;
  canAccessAdmin: boolean;
};

export function toAuthUserView(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUserView {
  const email = user.email ?? "sin-correo";
  const metaName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    "";

  const name = metaName.trim() || email.split("@")[0] || "Operador";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  const role = getRoleFromUser(user);
  const permissions = permissionsFromUser(user);
  const superAdmin = isSuperAdminUser(user) || isSuperAdmin(role);
  const roleName =
    typeof user.app_metadata?.role_name === "string"
      ? user.app_metadata.role_name
      : null;

  const subject = {
    role,
    isSuperAdmin: superAdmin,
    permissions,
    app_metadata: user.app_metadata,
  };

  const canAccessAdmin =
    superAdmin ||
    userHasPermission(subject, "users", "read") ||
    userHasPermission(subject, "roles", "read") ||
    userHasPermission(subject, "audit", "read") ||
    userHasPermission(subject, "configuration", "read") ||
    userHasPermission(subject, "ai", "read") ||
    userHasPermission(subject, "integrations", "read");

  return {
    name,
    email,
    initials: initials || "OP",
    role,
    roleLabel: roleLabel(role, roleName),
    isSuperAdmin: superAdmin,
    permissions,
    canAccessAdmin,
  };
}
