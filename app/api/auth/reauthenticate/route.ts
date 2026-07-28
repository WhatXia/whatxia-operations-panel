import { NextResponse, type NextRequest } from "next/server";
import {
  issueReauthToken,
  verifyUserPassword,
} from "@/lib/auth/reauth-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Body = {
  password?: string;
};

/**
 * Emite un token de reautenticación de corta duración tras validar la contraseña
 * con el mismo mecanismo de login (signInWithPassword), sin alterar la sesión.
 *
 * PANEL-SECURITY-001: no audita intentos fallidos ni el éxito del challenge;
 * la auditoría ocurre solo cuando el guardado de negocio (PATCH/POST) tiene éxito.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "No autenticado" },
      { status: 401 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as Body;
    password = body.password ?? "";
  } catch {
    password = "";
  }

  const verified = await verifyUserPassword(user.email, password);
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const token = issueReauthToken(user.id);

  return NextResponse.json({
    ok: true,
    token,
    expiresInMs: 2 * 60 * 1000,
  });
}
