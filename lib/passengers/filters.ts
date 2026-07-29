import type {
  PassengerStatus,
  PassengerStatusFilter,
} from "@/lib/passengers/types";
import { isPassengerStatus } from "@/lib/passengers/status";

export const PASSENGER_FILTERS: Array<{
  id: PassengerStatusFilter;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "PIONEER", label: "Pioneros" },
  { id: "BETA", label: "Beta" },
  { id: "ACTIVE", label: "Activos" },
  { id: "BLOCKED", label: "Bloqueados" },
];

export function parsePassengerFilter(
  value: string | null,
): PassengerStatusFilter {
  if (!value || value === "all") return "all";
  if (isPassengerStatus(value)) return value;
  return "all";
}
