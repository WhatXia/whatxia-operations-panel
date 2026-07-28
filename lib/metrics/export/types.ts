import type { MetricsSnapshot } from "@/lib/metrics/types";

/** Formatos previstos para el sprint de exportación. */
export type MetricsExportFormat = "pdf" | "excel";

export type MetricsExportRequest = {
  format: MetricsExportFormat;
  snapshot: MetricsSnapshot;
};

export type MetricsExportResult = {
  ok: false;
  deferred: true;
  format: MetricsExportFormat;
  message: string;
};
