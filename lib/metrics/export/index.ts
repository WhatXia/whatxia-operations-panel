import type {
  MetricsExportRequest,
  MetricsExportResult,
} from "@/lib/metrics/export/types";

/**
 * Punto de extensión para exportación PDF/Excel.
 * Sprint futuro: implementar generadores reales sin cambiar el contrato.
 */
export async function exportMetrics(
  request: MetricsExportRequest,
): Promise<MetricsExportResult> {
  return {
    ok: false,
    deferred: true,
    format: request.format,
    message: `Exportación ${request.format.toUpperCase()} pendiente del siguiente sprint.`,
  };
}

export type { MetricsExportFormat, MetricsExportRequest, MetricsExportResult } from "@/lib/metrics/export/types";
