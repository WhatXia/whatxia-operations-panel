import {
  formatDateTimeLabel,
  formatRelativeLabel,
} from "@/lib/dashboard/time";
import type { DriverAdminStatus } from "@/lib/drivers/types";

export function driverDisplayName(row: {
  preferred_name?: string | null;
  full_name?: string | null;
  name?: string | null;
}): string {
  return (
    row.preferred_name?.trim() ||
    row.full_name?.trim() ||
    row.name?.trim() ||
    "Conductor"
  );
}

export function formatVehicleLabel(row: {
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  vehicle_year?: number | null;
}): string {
  const parts = [
    row.vehicle_brand?.trim(),
    row.vehicle_model?.trim(),
    row.vehicle_year ? String(row.vehicle_year) : null,
    row.vehicle_color?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} •••• ${digits.slice(-4)}`;
}

export function deriveAdminStatus(row: {
  status?: string | null;
  suspended_until?: string | null;
}): DriverAdminStatus {
  if (row.status === "inactive") return "inactive";
  if (
    row.suspended_until &&
    new Date(row.suspended_until).getTime() > Date.now()
  ) {
    return "suspended";
  }
  return "active";
}

export function statusLabel(
  status: string | null | undefined,
  suspendedUntil?: string | null,
): string {
  const admin = deriveAdminStatus({
    status,
    suspended_until: suspendedUntil,
  });
  if (admin === "active") return "Activo";
  if (admin === "inactive") return "Inactivo";
  if (admin === "suspended") return "Suspendido";
  return status?.trim() || "—";
}

export function adminStatusLabel(admin: DriverAdminStatus): string {
  if (admin === "active") return "Activo";
  if (admin === "inactive") return "Inactivo";
  return "Suspendido";
}

export function availabilityLabel(isAvailable: boolean): {
  key: "available" | "busy";
  label: string;
} {
  return isAvailable
    ? { key: "available", label: "Disponible" }
    : { key: "busy", label: "Ocupado" };
}

export function formatLastActivity(
  iso: string | null,
  now = new Date(),
): string {
  if (!iso) return "Sin actividad";
  return formatRelativeLabel(iso, now);
}

export function formatDetailDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDateTimeLabel(iso);
}
