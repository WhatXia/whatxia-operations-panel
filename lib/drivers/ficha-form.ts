import type { DriverDetail } from "@/lib/drivers/types";
import type { DriverProfileEditableInput } from "@/lib/drivers/validation";

/** Snapshot editable de toda la ficha (Información + Vehículo). */
export function detailToDriverForm(
  detail: DriverDetail,
): DriverProfileEditableInput {
  return {
    email: detail.email ?? "",
    address: detail.address ?? "",
    city: detail.city ?? "",
    phone: detail.phone ?? "",
    adminStatus: detail.adminStatus,
    internalNotes: detail.internalNotes ?? "",
    plate: detail.plate === "—" ? "" : detail.plate,
    vehicleBrand: detail.vehicleBrand ?? "",
    vehicleModel: detail.vehicleModel ?? "",
    vehicleColor: detail.vehicleColor ?? "",
    vehicleYear: detail.vehicleYear ? String(detail.vehicleYear) : "",
  };
}

export const DRIVER_FICHA_INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-brand/60";
