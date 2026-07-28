import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { auditFromRequest } from "@/lib/audit/request";
import { ensureUserRole } from "@/lib/auth/ensure-role";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const started = Date.now();
  let email = "";

  try {
    const body = (await request.json()) as LoginBody;
    email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      await auditFromRequest(request, null, {
        action: "LOGIN_FAILED",
        result: "ERROR",
        module: "auth",
        message: "Credenciales incompletas",
        userEmail: email || null,
        durationMs: Date.now() - started,
      });
      return NextResponse.json(
        { ok: false, error: "Correo y contraseña requeridos" },
        { status: 400 },
      );
    }

    const { url, key } = getSupabaseEnv();
    type CookieToSet = {
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    };
    const cookieJar: CookieToSet[] = [];
    const responseHeaders = new Headers();

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            const idx = cookieJar.findIndex((item) => item.name === name);
            const entry = { name, value, options };
            if (idx >= 0) cookieJar[idx] = entry;
            else cookieJar.push(entry);
          });
          Object.entries(headers).forEach(([headerKey, value]) =>
            responseHeaders.set(headerKey, value),
          );
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      await auditFromRequest(request, null, {
        action: "LOGIN_FAILED",
        result: "ERROR",
        module: "auth",
        message: error?.message || "Credenciales inválidas",
        userEmail: email,
        durationMs: Date.now() - started,
      });
      return NextResponse.json(
        { ok: false, error: "No se pudo iniciar sesión" },
        { status: 401 },
      );
    }

    const role = await ensureUserRole(data.user);

    // Refrescar sesión para incorporar app_metadata.role en el JWT.
    await supabase.auth.refreshSession();

    const finalResponse = NextResponse.json(
      {
        ok: true,
        role,
        email: data.user.email ?? email,
      },
      { headers: responseHeaders },
    );
    cookieJar.forEach(({ name, value, options }) => {
      finalResponse.cookies.set(name, value, options);
    });

    await auditFromRequest(request, data.user, {
      action: "LOGIN",
      result: "OK",
      module: "auth",
      message: `Inicio de sesión correcto (${role})`,
      durationMs: Date.now() - started,
    });

    return finalResponse;
  } catch (error) {
    await auditFromRequest(request, null, {
      action: "AUTH_ERROR",
      result: "ERROR",
      module: "auth",
      message:
        error instanceof Error ? error.message : "Error de autenticación",
      userEmail: email || null,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      { ok: false, error: "Error de autenticación" },
      { status: 500 },
    );
  }
}
