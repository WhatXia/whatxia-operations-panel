import { getIpFromHeaders, parseUserAgent } from "@/lib/audit/ua";
import { writeAuditLogSafe } from "@/lib/audit/service";
import type {
  AuditAction,
  AuditInput,
  AuditResult,
  ReauthenticationResult,
} from "@/lib/audit/types";
import { moduleFromPath } from "@/lib/auth/permissions";
import { getRoleFromUser, type AppRole } from "@/lib/auth/roles";
import type { User } from "@supabase/supabase-js";

export type RequestAuditContext = {
  path: string;
  module: string;
  ipAddress: string | null;
  browser: string;
  os: string;
  device: string;
  userId: string | null;
  userEmail: string | null;
  role: AppRole | null;
  sessionId: string | null;
};

export function buildRequestAuditContext(
  request: Request,
  user?: User | null,
): RequestAuditContext {
  const path = new URL(request.url).pathname;
  const ua = parseUserAgent(request.headers.get("user-agent"));
  const role = getRoleFromUser(user ?? null);

  return {
    path,
    module: moduleFromPath(path),
    ipAddress: getIpFromHeaders(request.headers),
    browser: ua.browser,
    os: ua.os,
    device: ua.device,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    role,
    sessionId: user?.id ? `sess_${user.id.slice(0, 8)}` : null,
  };
}

export async function auditFromRequest(
  request: Request,
  user: User | null | undefined,
  partial: {
    action: AuditAction | string;
    result: AuditResult;
    message?: string | null;
    resource?: string | null;
    resourceId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    durationMs?: number | null;
    module?: string | null;
    path?: string | null;
    userEmail?: string | null;
    requiresReauthentication?: boolean | null;
    reauthenticationResult?: ReauthenticationResult | null;
  },
): Promise<void> {
  const ctx = buildRequestAuditContext(request, user);
  const payload: AuditInput = {
    action: partial.action,
    result: partial.result,
    module: partial.module ?? ctx.module,
    path: partial.path ?? ctx.path,
    resource: partial.resource ?? null,
    resourceId: partial.resourceId ?? null,
    message: partial.message ?? null,
    oldValues: partial.oldValues ?? null,
    newValues: partial.newValues ?? null,
    durationMs: partial.durationMs ?? null,
    userId: ctx.userId,
    userEmail: partial.userEmail ?? ctx.userEmail,
    role: ctx.role,
    sessionId: ctx.sessionId,
    ipAddress: ctx.ipAddress,
    browser: ctx.browser,
    os: ctx.os,
    device: ctx.device,
    requiresReauthentication: partial.requiresReauthentication ?? null,
    reauthenticationResult: partial.reauthenticationResult ?? null,
  };
  await writeAuditLogSafe(payload);
}
