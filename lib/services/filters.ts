import type { ServiceFilter } from "@/lib/services/types";

export const SERVICE_FILTERS: {
  id: ServiceFilter;
  label: string;
}[] = [
  { id: "all", label: "Todos" },
  { id: "requested", label: "Solicitados" },
  { id: "accepted", label: "Aceptados" },
  { id: "in_progress", label: "En curso" },
  { id: "completed", label: "Completados" },
  { id: "cancelled", label: "Cancelados" },
];

/** Mapeo UI → estados reales del bot (tabla trips). */
export const FILTER_STATUSES: Record<ServiceFilter, string[] | null> = {
  all: null,
  requested: ["SEARCHING"],
  accepted: ["ASSIGNED", "ETA_INFORMED", "DRIVER_ARRIVED"],
  in_progress: ["IN_PROGRESS"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED", "cancelled_no_driver"],
};

export function parseServiceFilter(value: string | null): ServiceFilter {
  const allowed = SERVICE_FILTERS.map((f) => f.id);
  if (value && (allowed as string[]).includes(value)) {
    return value as ServiceFilter;
  }
  return "all";
}

export function parseServiceSort(value: string | null): "newest" | "oldest" {
  return value === "oldest" ? "oldest" : "newest";
}
