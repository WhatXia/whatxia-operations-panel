import type { ComponentHealth } from "@/lib/system/types";

export function healthStatusLabel(status: ComponentHealth): string {
  switch (status) {
    case "ok":
      return "Operativo";
    case "warning":
      return "Advertencia";
    case "error":
      return "Error";
    default:
      return "Desconocido";
  }
}

export function healthEmoji(status: ComponentHealth): string {
  switch (status) {
    case "ok":
      return "🟢";
    case "warning":
      return "🟡";
    case "error":
      return "🔴";
    default:
      return "⚪";
  }
}

export function healthTone(
  status: ComponentHealth,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "ok":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    default:
      return "neutral";
  }
}

export function worstHealth(
  statuses: ComponentHealth[],
): ComponentHealth {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unknown")) return "unknown";
  if (statuses.every((s) => s === "ok")) return "ok";
  return "unknown";
}
