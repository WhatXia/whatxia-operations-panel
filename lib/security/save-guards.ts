/**
 * Guards reutilizables para mutaciones del Panel de Operaciones (PANEL-SECURITY-001).
 * Independiente de Conductores / Servicios / Admin — cualquier módulo puede componerlos.
 */

export type PanelSaveGuardContext = {
  /** Recurso lógico (ej. driver, role, bot_message). */
  resource: string;
  resourceId?: string | null;
  intendedChanges?: Record<string, unknown>;
};

export type PanelSaveGuardResult =
  | { ok: true; reauthToken?: string }
  | {
      ok: false;
      reason: string;
      code?: "REAUTH_CANCELLED" | "REAUTH_REQUIRED" | string;
    };

export type PanelSaveGuard = (
  ctx: PanelSaveGuardContext,
) => Promise<PanelSaveGuardResult>;

export async function runPanelSaveGuards(
  guards: PanelSaveGuard[],
  ctx: PanelSaveGuardContext,
): Promise<PanelSaveGuardResult> {
  let reauthToken: string | undefined;

  for (const guard of guards) {
    const result = await guard(ctx);
    if (!result.ok) return result;
    if (result.reauthToken) {
      reauthToken = result.reauthToken;
    }
  }

  return reauthToken ? { ok: true, reauthToken } : { ok: true };
}

/**
 * Guard de reautenticación por contraseña.
 * Usa el requestReauth del ReauthProvider (mismo flujo de login vía /api/auth/reauthenticate).
 */
export function createPasswordReauthGuard(
  requestReauth: () => Promise<string | null>,
): PanelSaveGuard {
  return async () => {
    const token = await requestReauth();
    if (!token) {
      return {
        ok: false,
        reason: "Reautenticación cancelada",
        code: "REAUTH_CANCELLED",
      };
    }
    return { ok: true, reauthToken: token };
  };
}
