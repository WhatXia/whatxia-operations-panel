type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand border-brand/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
  neutral: "bg-surface-hover text-muted-strong border-border",
};

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

export function serviceTone(
  status: string,
): Tone {
  switch (status) {
    case "completed":
    case "COMPLETED":
    case "available":
    case "ok":
    case "success":
      return "success";
    case "in_progress":
    case "IN_PROGRESS":
    case "DRIVER_ARRIVED":
    case "ETA_INFORMED":
    case "busy":
    case "info":
      return "info";
    case "assigned":
    case "ASSIGNED":
    case "SEARCHING":
    case "requested":
    case "degraded":
    case "warning":
      return "warning";
    case "cancelled":
    case "CANCELLED":
    case "cancelled_no_driver":
    case "failed":
    case "error":
    case "danger":
    case "inactive":
      return "danger";
    case "offline":
    case "unknown":
    case "neutral":
      return "neutral";
    default:
      return "neutral";
  }
}
