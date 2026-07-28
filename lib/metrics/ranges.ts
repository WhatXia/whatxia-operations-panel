import {
  addUtcDays,
  startOfBogotaDayIso,
  startOfTodayIso,
} from "@/lib/dashboard/time";
import type { MetricsRangePreset } from "@/lib/metrics/types";

export const METRICS_RANGE_OPTIONS: {
  id: MetricsRangePreset;
  label: string;
}[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "last_7_days", label: "Últimos 7 días" },
  { id: "last_30_days", label: "Últimos 30 días" },
  { id: "custom", label: "Personalizado" },
];

export function parseMetricsPreset(
  value: string | null,
): MetricsRangePreset {
  const allowed = METRICS_RANGE_OPTIONS.map((o) => o.id);
  if (value && (allowed as string[]).includes(value)) {
    return value as MetricsRangePreset;
  }
  return "today";
}

export function resolveMetricsRange(options: {
  preset: MetricsRangePreset;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): { from: string; to: string; label: string; preset: MetricsRangePreset } {
  const now = options.now ?? new Date();
  const todayStart = startOfTodayIso(now);
  const tomorrowStart = addUtcDays(todayStart, 1);

  switch (options.preset) {
    case "yesterday": {
      const from = addUtcDays(todayStart, -1);
      return {
        preset: options.preset,
        from,
        to: todayStart,
        label: "Ayer",
      };
    }
    case "last_7_days": {
      const from = addUtcDays(todayStart, -6);
      return {
        preset: options.preset,
        from,
        to: tomorrowStart,
        label: "Últimos 7 días",
      };
    }
    case "last_30_days": {
      const from = addUtcDays(todayStart, -29);
      return {
        preset: options.preset,
        from,
        to: tomorrowStart,
        label: "Últimos 30 días",
      };
    }
    case "custom": {
      const fromDate = options.from ? new Date(`${options.from}T12:00:00.000Z`) : now;
      const toDate = options.to ? new Date(`${options.to}T12:00:00.000Z`) : now;
      let from = startOfBogotaDayIso(fromDate);
      let to = addUtcDays(startOfBogotaDayIso(toDate), 1);
      if (new Date(from) > new Date(to)) {
        const tmp = from;
        from = addUtcDays(to, -1);
        to = addUtcDays(startOfBogotaDayIso(new Date(tmp)), 1);
      }
      return {
        preset: options.preset,
        from,
        to,
        label: "Personalizado",
      };
    }
    case "today":
    default:
      return {
        preset: "today",
        from: todayStart,
        to: tomorrowStart,
        label: "Hoy",
      };
  }
}
