import { createAdminClient } from "@/lib/supabase/admin";
import { deriveAdminStatus } from "@/lib/drivers/format";
import { fetchDriverDetail } from "@/lib/drivers/queries";
import type { DriverDetail } from "@/lib/drivers/types";
import {
  PANEL_INDEFINITE_SUSPENSION_ISO,
  sanitizeDriverProfileInput,
  validateDriverProfileInput,
  type DriverAdminStatus,
  type DriverProfileEditableInput,
} from "@/lib/drivers/validation";

export type DriverFieldChange = {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

export type UpdateDriverProfileResult = {
  detail: DriverDetail;
  changes: DriverFieldChange[];
};

const FIELD_LABELS: Record<string, string> = {
  email: "Correo electrónico",
  address: "Dirección",
  city: "Ciudad",
  phone: "Número de WhatsApp",
  adminStatus: "Estado del conductor",
  internalNotes: "Observaciones internas",
  plate: "Placa",
  vehicleBrand: "Marca",
  vehicleModel: "Modelo",
  vehicleColor: "Color",
  vehicleYear: "Año",
};

function nullishEqual(a: unknown, b: unknown): boolean {
  const na = a == null || a === "" ? null : a;
  const nb = b == null || b === "" ? null : b;
  return na === nb;
}

function statusPatch(adminStatus: DriverAdminStatus): {
  status: string;
  suspended_until: string | null;
} {
  switch (adminStatus) {
    case "inactive":
      return { status: "inactive", suspended_until: null };
    case "suspended":
      return {
        status: "active",
        suspended_until: PANEL_INDEFINITE_SUSPENSION_ISO,
      };
    case "active":
    default:
      return { status: "active", suspended_until: null };
  }
}

/**
 * Actualiza campos autorizados de la ficha (Información + Vehículo) en una sola operación.
 * Nunca toca id, document_id, full_name, name, preferred_name, created_at.
 */
export async function updateDriverProfile(
  driverId: string,
  input: DriverProfileEditableInput,
): Promise<UpdateDriverProfileResult> {
  const issues = validateDriverProfileInput(input);
  if (issues.length > 0) {
    throw new Error(issues.map((i) => i.message).join(" · "));
  }

  const sanitized = sanitizeDriverProfileInput(input);
  const before = await fetchDriverDetail(driverId);
  const beforeAdmin = deriveAdminStatus({
    status: before.status,
    suspended_until: before.suspendedUntil,
  });
  const nextStatus = statusPatch(sanitized.adminStatus);

  const supabase = createAdminClient();

  if (sanitized.phone !== before.phone.replace(/\D/g, "")) {
    const { data: conflict } = await supabase
      .from("drivers")
      .select("id")
      .eq("phone", sanitized.phone)
      .neq("id", driverId)
      .maybeSingle();
    if (conflict) {
      throw new Error("Ya existe otro conductor con ese número de WhatsApp");
    }
  }

  const dbPatch: Record<string, unknown> = {
    email: sanitized.email,
    address: sanitized.address,
    city: sanitized.city,
    phone: sanitized.phone,
    status: nextStatus.status,
    suspended_until: nextStatus.suspended_until,
    internal_notes: sanitized.internalNotes,
    plate: sanitized.plate,
    vehicle_brand: sanitized.vehicleBrand,
    vehicle_model: sanitized.vehicleModel,
    vehicle_color: sanitized.vehicleColor,
    vehicle_year: sanitized.vehicleYear,
  };

  const changes: DriverFieldChange[] = [];

  const track = (field: string, oldValue: unknown, newValue: unknown) => {
    if (nullishEqual(oldValue, newValue)) return;
    changes.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    });
  };

  track("email", before.email, sanitized.email);
  track("address", before.address, sanitized.address);
  track("city", before.city, sanitized.city);
  track("phone", before.phone.replace(/\D/g, ""), sanitized.phone);
  track("adminStatus", beforeAdmin, sanitized.adminStatus);
  track("internalNotes", before.internalNotes, sanitized.internalNotes);
  track(
    "plate",
    (before.plate === "—" ? "" : before.plate).toUpperCase(),
    sanitized.plate,
  );
  track("vehicleBrand", before.vehicleBrand, sanitized.vehicleBrand);
  track("vehicleModel", before.vehicleModel, sanitized.vehicleModel);
  track("vehicleColor", before.vehicleColor, sanitized.vehicleColor);
  track("vehicleYear", before.vehicleYear, sanitized.vehicleYear);

  if (changes.length === 0) {
    return { detail: before, changes: [] };
  }

  const { error } = await supabase
    .from("drivers")
    .update(dbPatch)
    .eq("id", driverId);

  if (error) {
    if (
      error.message.includes("internal_notes") ||
      error.code === "42703" ||
      error.message.toLowerCase().includes("column")
    ) {
      throw new Error(
        "No se pudo guardar: ¿aplicaste la migración 005 (internal_notes)?",
      );
    }
    throw new Error(error.message || "No se pudo actualizar el conductor");
  }

  const detail = await fetchDriverDetail(driverId);
  return { detail, changes };
}

export { deriveAdminStatus } from "@/lib/drivers/format";
