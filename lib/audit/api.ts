import type { NextRequest } from "next/server";
import { auditFromRequest } from "@/lib/audit/request";
import type { AuditAction } from "@/lib/audit/types";
import type {
  PermissionLevel,
  PermissionModule,
} from "@/lib/auth/permission-catalog";
import { requireReauthentication } from "@/lib/auth/reauth-server";
import { requireApiAuth } from "@/lib/auth/require";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export type AuditedHandlerResult = {
  response: NextResponse;
  resourceId?: string | null;
  message?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

export async function withAuditedApi(
  request: Request,
  options: {
    action: AuditAction | string;
    adminOnly?: boolean;
    module?: PermissionModule;
    level?: PermissionLevel;
    resource?: string;
    resourceId?: string | null;
    /** Solo para endpoints de auth. Las mutaciones SIEMPRE reautentican. */
    skipReauth?: boolean;
  },
  handler: (ctx: {
    user: User;
    role: AppRole;
    started: number;
  }) => Promise<NextResponse | AuditedHandlerResult>,
): Promise<NextResponse> {
  const started = Date.now();
  const authz = await requireApiAuth(request, {
    adminOnly: options.adminOnly,
    module: options.module,
    level: options.level,
  });

  if (!authz.ok) return authz.response;

  let requiresReauthentication = false;
  let reauthenticationResult: "SUCCESS" | "FAILED" | null = null;

  if (!options.skipReauth) {
    const reauth = await requireReauthentication(request, authz.user);
    if (!reauth.ok) {
      return reauth.response;
    }
    if (reauth.required) {
      requiresReauthentication = true;
      reauthenticationResult = reauth.reauthenticationResult;
    }
  }

  try {
    const raw = await handler({
      user: authz.user,
      role: authz.role,
      started,
    });

    const wrapped: AuditedHandlerResult =
      raw instanceof NextResponse ? { response: raw } : raw;
    const response = wrapped.response;
    const ok = response.status < 400;

    await auditFromRequest(request, authz.user, {
      action: options.action,
      result: ok ? "OK" : "ERROR",
      resource: options.resource ?? null,
      resourceId: wrapped.resourceId ?? options.resourceId ?? null,
      message:
        wrapped.message ??
        (ok
          ? `${options.action} OK`
          : `${options.action} HTTP ${response.status}`),
      oldValues: wrapped.oldValues ?? null,
      newValues: wrapped.newValues ?? null,
      durationMs: Date.now() - started,
      requiresReauthentication: requiresReauthentication || null,
      reauthenticationResult,
    });

    return response;
  } catch (error) {
    await auditFromRequest(request, authz.user, {
      action: "SYSTEM_ERROR",
      result: "ERROR",
      resource: options.resource ?? null,
      resourceId: options.resourceId ?? null,
      message:
        error instanceof Error ? error.message : "Error interno de API",
      durationMs: Date.now() - started,
      requiresReauthentication: requiresReauthentication || null,
      reauthenticationResult,
    });
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 },
    );
  }
}

export type { NextRequest };
