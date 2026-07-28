/**
 * Punto de extensión de guardado de la Ficha del Conductor.
 * La lógica de reauth vive en lib/security/save-guards (reutilizable en todo el panel).
 */

import { REAUTH_HEADER } from "@/lib/auth/reauth-constants";
import {
  runPanelSaveGuards,
  type PanelSaveGuard,
  type PanelSaveGuardResult,
} from "@/lib/security/save-guards";

export type DriverProfileSaveContext = {
  driverId: string;
  intendedChanges: Record<string, unknown>;
};

export type DriverProfileSaveGuardResult = PanelSaveGuardResult;
export type DriverProfileSaveGuard = PanelSaveGuard;

/** Guards estáticos opcionales del módulo (sin reauth; esa se inyecta al guardar). */
export const driverProfileSaveGuards: DriverProfileSaveGuard[] = [];

/**
 * Ejecuta guards del módulo + guards inyectados (p. ej. createPasswordReauthGuard).
 */
export async function runDriverProfileSaveGuards(
  ctx: DriverProfileSaveContext,
  extraGuards: DriverProfileSaveGuard[] = [],
): Promise<DriverProfileSaveGuardResult> {
  return runPanelSaveGuards([...driverProfileSaveGuards, ...extraGuards], {
    resource: "driver",
    resourceId: ctx.driverId,
    intendedChanges: ctx.intendedChanges,
  });
}

/** PATCH del perfil adjuntando token de reauth cuando exista. */
export async function postDriverProfileUpdate(
  driverId: string,
  body: Record<string, unknown>,
  options?: { reauthToken?: string },
): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options?.reauthToken) {
    headers.set(REAUTH_HEADER, options.reauthToken);
  }
  return fetch(`/api/drivers/${driverId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}
