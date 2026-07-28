import type { MetricsPoint } from "@/lib/metrics/types";

export function VerticalBarChart({
  points,
  emptyLabel = "Sin datos",
  compactLabels = false,
}: {
  points: MetricsPoint[];
  emptyLabel?: string;
  compactLabels?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (points.length === 0 || max === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="mt-4 flex h-48 items-end gap-1 overflow-x-auto pb-1">
      {points.map((point) => (
        <div
          key={point.key}
          className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
          title={`${point.label}: ${point.value}`}
        >
          <span className="font-mono text-[10px] text-muted">{point.value}</span>
          <div className="flex h-36 w-full items-end rounded-md bg-surface">
            <div
              className="w-full rounded-md bg-gradient-to-t from-brand/75 to-brand"
              style={{
                height: `${Math.max((point.value / max) * 100, point.value > 0 ? 6 : 0)}%`,
              }}
            />
          </div>
          <span
            className={`text-[10px] text-muted ${
              compactLabels ? "max-w-full truncate" : ""
            }`}
          >
            {compactLabels ? point.label.replace(":00", "") : point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HorizontalBarList({
  points,
  emptyLabel = "Sin datos",
}: {
  points: MetricsPoint[];
  emptyLabel?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (points.length === 0 || max === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {points.map((point) => (
        <li key={point.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-strong">{point.label}</span>
            <span className="font-mono text-xs text-foreground">
              {point.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(point.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
