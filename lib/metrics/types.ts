export type MetricsRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "custom";

export type MetricsPoint = {
  key: string;
  label: string;
  value: number;
};

export type MetricsKpis = {
  servicesToday: number;
  servicesWeek: number;
  servicesMonth: number;
  completionRate: number | null;
  completionRateLabel: string;
  cancellationRate: number | null;
  cancellationRateLabel: string;
  driversActive: number;
  driversAvailable: number;
  avgAcceptanceMinutes: number | null;
  avgAcceptanceLabel: string;
  avgDurationMinutes: number | null;
  avgDurationLabel: string;
  hasDurationData: boolean;
  hasAcceptanceData: boolean;
};

export type MetricsCharts = {
  byHourToday: MetricsPoint[];
  byDay30: MetricsPoint[];
  byStatus: MetricsPoint[];
  topDrivers: MetricsPoint[];
  growthTrend: MetricsPoint[];
};

export type MetricsSnapshot = {
  fetchedAt: string;
  fetchedAtLabel: string;
  timezone: string;
  range: {
    preset: MetricsRangePreset;
    label: string;
    from: string;
    to: string;
  };
  kpis: MetricsKpis;
  charts: MetricsCharts;
  totalsInRange: {
    created: number;
    completed: number;
    cancelled: number;
  };
};

export type MetricsResponse =
  | { ok: true; data: MetricsSnapshot }
  | { ok: false; error: string };
