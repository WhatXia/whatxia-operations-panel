import { NextResponse } from "next/server";
import { auditFromRequest } from "@/lib/audit/request";
import {
  canAccessPath,
  userHasPermission,
} from "@/lib/auth/permissions";
import type { PermissionLevel, PermissionModule } from "@/lib/auth/permission-catalog";
import { ensureUserRole } from "@/lib/auth/ensure-role";
import { getRoleFromUser, isSuperAdmin, type AppRole } from "@/lib/auth/roles";
import {
  isSuperAdminUser,
  permissionsFromUser,
} from "@/lib/auth/permission-resolve";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthzOk = {
  ok: true;
  user: User;
  role: AppRole;
};

export type AuthzFail = {
  ok: false;
  response: NextResponse;
};

export async function requireApiAuth(
  request: Request,
  options?: {
    adminOnly?: boolean;
    module?: PermissionModule;
    level?: PermissionLevel;
  },
): Promise<AuthzOk | AuthzFail> {
  const started = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await auditFromRequest(request, null, {
      action: "AUTH_ERROR",
      result: "ERROR",
      message: "API sin autenticación",
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 },
      ),
    };
  }

  const role = await ensureUserRole(user);
  const path = new URL(request.url).pathname;
  const method = request.method;
  const subject = {
    role,
    isSuperAdmin: isSuperAdminUser(user) || isSuperAdmin(role),
    permissions: permissionsFromUser(user),
    app_metadata: user.app_metadata,
  };

  if (options?.adminOnly) {
    const allowed =
      subject.isSuperAdmin ||
      userHasPermission(subject, options.module ?? "configuration", options.level ?? "admin");
    if (!allowed) {
      await auditFromRequest(request, user, {
        action: "UNAUTHORIZED_ACCESS",
        result: "ERROR",
        message: "Intento de acceso a API de administración sin privilegios",
        durationMs: Date.now() - started,
      });
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
  }

  if (options?.module) {
    if (!userHasPermission(subject, options.module, options.level ?? "read")) {
      await auditFromRequest(request, user, {
        action: "PERMISSION_ERROR",
        result: "ERROR",
        message: `Permiso insuficiente en módulo ${options.module}`,
        durationMs: Date.now() - started,
      });
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
  } else if (!canAccessPath(subject, path, method)) {
    await auditFromRequest(request, user, {
      action: "PERMISSION_ERROR",
      result: "ERROR",
      message: `Permiso denegado para ${path}`,
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user, role: getRoleFromUser(user) ?? role };
}
