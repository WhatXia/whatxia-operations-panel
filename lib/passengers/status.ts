import type {
  PassengerStatus,
  PassengerStatusAction,
} from "@/lib/passengers/types";
import { PASSENGER_STATUSES } from "@/lib/passengers/types";

export function isPassengerStatus(value: unknown): value is PassengerStatus {
  return (
    typeof value === "string" &&
    (PASSENGER_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizePassengerStatus(value: unknown): PassengerStatus {
  if (isPassengerStatus(value)) return value;
  return "PIONEER";
}

/** Transiciones permitidas en OPS-USER-001 (mismas del bot). */
export function resolveStatusTransition(
  current: PassengerStatus,
  action: PassengerStatusAction,
): PassengerStatus | null {
  switch (action) {
    case "invite_beta":
      return current === "PIONEER" ? "BETA" : null;
    case "activate":
      return current === "PIONEER" || current === "BETA" ? "ACTIVE" : null;
    case "block":
      return current === "ACTIVE" ? "BLOCKED" : null;
    case "unblock":
      return current === "BLOCKED" ? "ACTIVE" : null;
    default:
      return null;
  }
}

export function availableActionsForStatus(
  status: PassengerStatus,
): PassengerStatusAction[] {
  const actions: PassengerStatusAction[] = [];
  if (resolveStatusTransition(status, "invite_beta")) actions.push("invite_beta");
  if (resolveStatusTransition(status, "activate")) actions.push("activate");
  if (resolveStatusTransition(status, "block")) actions.push("block");
  if (resolveStatusTransition(status, "unblock")) actions.push("unblock");
  return actions;
}

export const STATUS_ACTION_LABELS: Record<PassengerStatusAction, string> = {
  invite_beta: "Invitar a pruebas",
  activate: "Activar",
  block: "Bloquear",
  unblock: "Desbloquear",
};
