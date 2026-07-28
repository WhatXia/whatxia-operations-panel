import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  REAUTH_HEADER,
  isMutatingMethod,
  isReauthExemptPath,
  issueReauthToken,
  verifyReauthToken,
  type ReauthResult,
} from "@/lib/auth/reauth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

/**
 * Valida la contraseña del usuario autenticado sin alterar la sesión del navegador.
 */
export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!password.trim()) {
    return { ok: false, message: "Contraseña requerida" };
  }

  const { url, key } = getSupabaseEnv();
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: "Contraseña incorrecta" };
  }

  return { ok: true };
}

export type ReauthGate =
  | {
      ok: true;
      required: false;
    }
  | {
      ok: true;
      required: true;
      reauthenticationResult: "SUCCESS";
    }
  | {
      ok: false;
      required: true;
      reauthenticationResult: "FAILED";
      response: NextResponse;
    };

/**
 * Exige token de reautenticación válido en mutaciones (POST/PUT/PATCH/DELETE).
 * Sin excepciones salvo login y el propio endpoint de reautenticación.
 */
export async function requireReauthentication(
  request: Request,
  user: User,
): Promise<ReauthGate> {
  const path = new URL(request.url).pathname;

  if (!isMutatingMethod(request.method) || isReauthExemptPath(path)) {
    return { ok: true, required: false };
  }

  const token = request.headers.get(REAUTH_HEADER);
  const verified = verifyReauthToken(token, user.id);

  if (!verified.ok) {
    // Sin auditoría de fallos: solo el guardado exitoso genera audit log.
    return {
      ok: false,
      required: true,
      reauthenticationResult: "FAILED",
      response: NextResponse.json(
        {
          ok: false,
          error: "Se requiere reautenticación",
          code: "REAUTH_REQUIRED",
          detail: verified.reason,
        },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true,
    required: true,
    reauthenticationResult: "SUCCESS",
  };
}

export type { ReauthResult };
export { issueReauthToken, REAUTH_HEADER };
