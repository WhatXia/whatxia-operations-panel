import type { AppRole } from "@/lib/auth/roles";

export type AuditResult = "OK" | "ERROR";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "REFRESH_TOKEN"
  | "PASSWORD_CHANGE"
  | "VIEW_DASHBOARD"
  | "VIEW_SERVICES"
  | "VIEW_SERVICE"
  | "VIEW_DRIVERS"
  | "VIEW_DRIVER"
  | "VIEW_METRICS"
  | "VIEW_SYSTEM_STATUS"
  | "VIEW_AUDIT"
  | "VIEW_CONVERSATIONS"
  | "VIEW_CONVERSATION"
  | "BLOCK_DRIVER"
  | "UNBLOCK_DRIVER"
  | "APPROVE_NOVELTY"
  | "REJECT_NOVELTY"
  | "EXPORT_DATA"
  | "CONFIG_CHANGE"
  | "CREATE_USER"
  | "DELETE_USER"
  | "UPDATE_USER"
  | "ROLE_CHANGE"
  | "ROLE_CREATE"
  | "ROLE_UPDATE"
  | "ROLE_DELETE"
  | "ROLE_DUPLICATE"
  | "PERMISSION_CHANGE"
  | "ROLE_ASSIGN_USER"
  | "ROLE_REMOVE_USER"
  | "REAUTH_CHALLENGE"
  | "REAUTH_SUCCESS"
  | "REAUTH_FAILED"
  | "REAUTH_REQUIRED"
  | "UNAUTHORIZED_ACCESS"
  | "PERMISSION_ERROR"
  | "AUTH_ERROR"
  | "SYSTEM_ERROR";

export type ReauthenticationResult = "SUCCESS" | "FAILED";

export type AuditInput = {
  action: AuditAction | string;
  result: AuditResult;
  module?: string | null;
  path?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  message?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  durationMs?: number | null;
  userId?: string | null;
  userEmail?: string | null;
  role?: AppRole | string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  requiresReauthentication?: boolean | null;
  reauthenticationResult?: ReauthenticationResult | null;
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  user_id: string | null;
  role: string | null;
  session_id: string | null;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  path: string | null;
  module: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  result: AuditResult;
  message: string | null;
  duration_ms: number | null;
  requires_reauthentication?: boolean | null;
  reauthentication_result?: "SUCCESS" | "FAILED" | null;
};
