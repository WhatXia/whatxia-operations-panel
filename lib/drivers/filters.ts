import type { DriverFilter, DriverSort } from "@/lib/drivers/types";

export const DRIVER_FILTERS: { id: DriverFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Inactivos" },
  { id: "available", label: "Disponibles" },
  { id: "busy", label: "Ocupados" },
];

export function parseDriverFilter(value: string | null): DriverFilter {
  const allowed = DRIVER_FILTERS.map((f) => f.id);
  if (value && (allowed as string[]).includes(value)) {
    return value as DriverFilter;
  }
  return "all";
}

export function parseDriverSort(value: string | null): DriverSort {
  if (value === "name_asc" || value === "name_desc" || value === "newest") {
    return value;
  }
  return "newest";
}
