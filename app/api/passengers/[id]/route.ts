import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  fetchPassengerDetail,
  updatePassengerStatusByAction,
  type PassengerDetailResponse,
  type PassengerStatusUpdateResponse,
} from "@/lib/passengers/queries";
import {
  resolveStatusTransition,
  STATUS_ACTION_LABELS,
} from "@/lib/passengers/status";
import type { PassengerStatusAction } from "@/lib/passengers/types";
import { normalizePassengerStatus } from "@/lib/passengers/status";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<PassengerStatusAction>([
  "invite_beta",
  "activate",
  "block",
  "unblock",
]);

function isStatusAction(value: unknown): value is PassengerStatusAction {
  return typeof value === "string" && ACTIONS.has(value as PassengerStatusAction);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_PASSENGER",
      resource: "passenger",
      resourceId: id,
      module: "passengers",
      level: "read",
    },
    async () => {
      if (!id) {
        const body: PassengerDetailResponse = {
          ok: false,
          error: "ID inválido",
        };
        return NextResponse.json(body, { status: 400 });
      }

      try {
        const data = await fetchPassengerDetail(id);
        const body: PassengerDetailResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al consultar usuario";
        const status = message.includes("no encontrado") ? 404 : 500;
        const body: PassengerDetailResponse = { ok: false, error: message };
        return NextResponse.json(body, { status });
      }
    },
  );
}

/**
 * OPS-USER-001 — cambio de estado (PIONEER/BETA/ACTIVE/BLOCKED).
 * Requiere reauth + permiso passengers ≥ edit.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "UPDATE_PASSENGER_STATUS",
      resource: "passenger",
      resourceId: id,
      module: "passengers",
      level: "edit",
    },
    async ({ user }) => {
      if (!id) {
        const body: PassengerStatusUpdateResponse = {
          ok: false,
          error: "ID inválido",
        };
        return {
          response: NextResponse.json(body, { status: 400 }),
        };
      }

      let payload: { action?: unknown };
      try {
        payload = await request.json();
      } catch {
        const body: PassengerStatusUpdateResponse = {
          ok: false,
          error: "JSON inválido",
        };
        return {
          response: NextResponse.json(body, { status: 400 }),
        };
      }

      if (!isStatusAction(payload.action)) {
        const body: PassengerStatusUpdateResponse = {
          ok: false,
          error: "Acción inválida",
        };
        return {
          response: NextResponse.json(body, { status: 400 }),
        };
      }

      try {
        const current = await fetchPassengerDetail(id);
        const currentStatus = normalizePassengerStatus(current.status);
        const nextStatus = resolveStatusTransition(currentStatus, payload.action);

        if (!nextStatus) {
          const body: PassengerStatusUpdateResponse = {
            ok: false,
            error: `Transición no permitida: ${STATUS_ACTION_LABELS[payload.action]} desde ${currentStatus}`,
          };
          return {
            response: NextResponse.json(body, { status: 400 }),
            resourceId: id,
            message: body.error,
            oldValues: { status: currentStatus },
            newValues: { action: payload.action },
          };
        }

        const data = await updatePassengerStatusByAction(id, nextStatus);
        const body: PassengerStatusUpdateResponse = { ok: true, data };

        return {
          response: NextResponse.json(body, {
            headers: { "Cache-Control": "no-store" },
          }),
          resourceId: id,
          message: `${STATUS_ACTION_LABELS[payload.action]}: ${currentStatus} → ${nextStatus}`,
          oldValues: {
            status: currentStatus,
            changedBy: user.email ?? user.id,
            origin: "Panel de Operaciones",
          },
          newValues: {
            status: nextStatus,
            action: payload.action,
            changedBy: user.email ?? user.id,
            origin: "Panel de Operaciones",
          },
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al actualizar estado";
        const status = message.includes("no encontrado") ? 404 : 400;
        const body: PassengerStatusUpdateResponse = { ok: false, error: message };
        return {
          response: NextResponse.json(body, { status }),
          resourceId: id,
          message,
        };
      }
    },
  );
}
