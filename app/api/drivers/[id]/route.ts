import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { fetchDriverDetail } from "@/lib/drivers/queries";
import { updateDriverProfile } from "@/lib/drivers/update";
import type {
  DriverDetailResponse,
  DriverUpdateResponse,
} from "@/lib/drivers/types";
import type { DriverAdminStatus } from "@/lib/drivers/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_DRIVER",
      resource: "driver",
      resourceId: id,
      module: "drivers",
      level: "read",
    },
    async () => {
      if (!id) {
        const body: DriverDetailResponse = {
          ok: false,
          error: "ID inválido",
        };
        return NextResponse.json(body, { status: 400 });
      }

      try {
        const data = await fetchDriverDetail(id);
        const body: DriverDetailResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al consultar conductor";
        const status = message.includes("no encontrado") ? 404 : 500;
        const body: DriverDetailResponse = { ok: false, error: message };
        return NextResponse.json(body, { status });
      }
    },
  );
}

/**
 * PANEL-DRIVERS-003 / PANEL-SECURITY-001 — actualización de ficha.
 * Requiere token de reautenticación (header x-whatxia-reauth).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "UPDATE_DRIVER",
      resource: "driver",
      resourceId: id,
      module: "drivers",
      level: "edit",
    },
    async ({ user }) => {
      if (!id) {
        const body: DriverUpdateResponse = {
          ok: false,
          error: "ID inválido",
        };
        return {
          response: NextResponse.json(body, { status: 400 }),
        };
      }

      let payload: {
        email?: string;
        address?: string;
        city?: string;
        phone?: string;
        adminStatus?: DriverAdminStatus;
        internalNotes?: string;
        plate?: string;
        vehicleBrand?: string;
        vehicleModel?: string;
        vehicleColor?: string;
        vehicleYear?: string;
      };

      try {
        payload = await request.json();
      } catch {
        const body: DriverUpdateResponse = {
          ok: false,
          error: "JSON inválido",
        };
        return {
          response: NextResponse.json(body, { status: 400 }),
        };
      }

      try {
        const result = await updateDriverProfile(id, {
          email: payload.email ?? "",
          address: payload.address ?? "",
          city: payload.city ?? "",
          phone: payload.phone ?? "",
          adminStatus: (payload.adminStatus ?? "active") as DriverAdminStatus,
          internalNotes: payload.internalNotes ?? "",
          plate: payload.plate ?? "",
          vehicleBrand: payload.vehicleBrand ?? "",
          vehicleModel: payload.vehicleModel ?? "",
          vehicleColor: payload.vehicleColor ?? "",
          vehicleYear: payload.vehicleYear ?? "",
        });

        const body: DriverUpdateResponse = {
          ok: true,
          data: result.detail,
          changes: result.changes,
        };

        const oldValues: Record<string, unknown> = {
          origin: "Panel de Operaciones",
          changedBy: user.email ?? user.id,
        };
        const newValues: Record<string, unknown> = {
          origin: "Panel de Operaciones",
          changedBy: user.email ?? user.id,
          changeCount: result.changes.length,
        };

        for (const change of result.changes) {
          oldValues[change.field] = change.oldValue;
          newValues[change.field] = change.newValue;
        }

        newValues.changes = result.changes.map((c) => ({
          field: c.field,
          label: c.label,
          oldValue: c.oldValue,
          newValue: c.newValue,
        }));

        return {
          response: NextResponse.json(body, {
            headers: { "Cache-Control": "no-store" },
          }),
          resourceId: id,
          message:
            result.changes.length === 0
              ? `Sin cambios en conductor ${id}`
              : `Conductor actualizado (${result.changes.length} campo(s)) desde Panel de Operaciones`,
          oldValues,
          newValues,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al actualizar conductor";
        const status = message.includes("no encontrado") ? 404 : 400;
        const body: DriverUpdateResponse = { ok: false, error: message };
        return {
          response: NextResponse.json(body, { status }),
          resourceId: id,
          message,
        };
      }
    },
  );
}
