import type { HealthStatus, TripStatus } from "@/lib/dashboard/types";

export const ACTIVE_TRIP_STATUSES = [
  "SEARCHING",
  "ASSIGNED",
  "ETA_INFORMED",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
] as const;

export const CANCELLED_TRIP_STATUSES = [
  "CANCELLED",
  "cancelled_no_driver",
] as const;

export const tripStatusLabel: Record<string, string> = {
  SEARCHING: "Buscando",
  ASSIGNED: "Asignado",
  ETA_INFORMED: "ETA informado",
  DRIVER_ARRIVED: "En sitio",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  cancelled_no_driver: "Sin conductor",
};

export function labelForTripStatus(status: TripStatus): string {
  return tripStatusLabel[status] ?? status;
}

export type BadgeTone =
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export function toneForTripStatus(status: TripStatus): BadgeTone {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
    case "DRIVER_ARRIVED":
    case "ETA_INFORMED":
      return "info";
    case "ASSIGNED":
    case "SEARCHING":
      return "warning";
    case "CANCELLED":
    case "cancelled_no_driver":
      return "danger";
    default:
      return "neutral";
  }
}

export function toneForHealth(status: HealthStatus): BadgeTone {
  switch (status) {
    case "ok":
      return "success";
    case "degraded":
      return "warning";
    case "error":
      return "danger";
    default:
      return "neutral";
  }
}

export function healthLabel(status: HealthStatus): string {
  switch (status) {
    case "ok":
      return "Operativo";
    case "degraded":
      return "Degradado";
    case "error":
      return "Error";
    default:
      return "Desconocido";
  }
}
