import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLogSafe } from "@/lib/audit/service";
import { getIpFromHeaders, parseUserAgent } from "@/lib/audit/ua";
import { isProtectedPath } from "@/lib/auth/constants";
import {
  canAccessPath,
  isAdminApiPath,
  isAdminPath,
  moduleFromPath,
} from "@/lib/auth/permissions";
import { getRoleFromUser, isSuperAdmin } from "@/lib/auth/roles";
import {
  isSuperAdminUser,
  permissionsFromUser,
} from "@/lib/auth/permission-resolve";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function auditForbidden(
  request: NextRequest,
  user: {
    id?: string;
    email?: string | null;
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null,
  message: string,
) {
  const ua = parseUserAgent(request.headers.get("user-agent"));
  const role = getRoleFromUser(user);
  await writeAuditLogSafe({
    action: "UNAUTHORIZED_ACCESS",
    result: "ERROR",
    module: moduleFromPath(request.nextUrl.pathname),
    path: request.nextUrl.pathname,
    message,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    role,
    sessionId: user?.id ? `sess_${user.id.slice(0, 8)}` : null,
    ipAddress: getIpFromHeaders(request.headers),
    browser: ua.browser,
    os: ua.os,
    device: ua.device,
  });
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([headerKey, value]) =>
          supabaseResponse.headers.set(headerKey, value),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (!user && (isProtectedPath(pathname) || isAdminApiPath(pathname))) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  if (user && (isProtectedPath(pathname) || isAdminApiPath(pathname) || isAdminPath(pathname))) {
    const role = getRoleFromUser(user);
    const subject = {
      role,
      isSuperAdmin: isSuperAdminUser(user) || isSuperAdmin(role),
      permissions: permissionsFromUser(user),
      app_metadata: user.app_metadata,
    };

    if (!canAccessPath(subject, pathname, request.method)) {
      await auditForbidden(
        request,
        user,
        `Intento de acceso no autorizado a ${pathname}`,
      );

      if (isApi) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/forbidden";
      return NextResponse.rewrite(forbiddenUrl, { status: 403 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
