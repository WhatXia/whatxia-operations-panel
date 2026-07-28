import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversationDetail } from "@/lib/conversations/types";

export type ConversationPdfExportResult = {
  ok: boolean;
  ready: boolean;
  format: "pdf";
  filename: string;
  message: string;
  blockers: string[];
  /** Payload estructurado listo para un generador PDF en un sprint futuro. */
  payload: {
    title: string;
    generatedAt: string;
    timezone: string;
    summary: Record<string, string>;
    conversation: Array<{
      at: string;
      origin: string;
      content: string;
      status: string;
    }>;
    timeline: Array<{ at: string; title: string; detail: string | null }>;
    audit: Array<{
      at: string;
      user: string;
      action: string;
      result: string;
    }>;
    gaps: string[];
  };
};

/**
 * Arquitectura de exportación PDF.
 * No genera archivo binario todavía: el transcript bot↔usuario no está completo.
 */
export async function prepareConversationPdfExport(
  detail: ConversationDetail,
): Promise<ConversationPdfExportResult> {
  const filename = `whatxia-conversacion-${detail.shortId}.pdf`;

  const payload = {
    title: `Conversation Inspector — ${detail.shortId}`,
    generatedAt: detail.generatedAt,
    timezone: detail.timezone,
    summary: Object.fromEntries(
      [...detail.sidePanel.service, ...detail.sidePanel.passenger, ...detail.sidePanel.driver]
        .filter((f) => f.available)
        .map((f) => [f.label, f.value]),
    ),
    conversation: detail.messages
      .filter((m) => m.available)
      .map((m) => ({
        at: m.createdAt,
        origin: m.originLabel,
        content: m.content,
        status: m.statusLabel,
      })),
    timeline: detail.timeline
      .filter((e) => e.source !== "gap")
      .map((e) => ({
        at: e.at,
        title: e.title,
        detail: e.detail,
      })),
    audit: detail.audit.map((a) => ({
      at: a.createdAt,
      user: a.userEmail || "—",
      action: a.action,
      result: a.result,
    })),
    gaps: detail.gaps.map((g) => `${g.label}: ${g.reason}`),
  };

  return {
    ok: true,
    ready: false,
    format: "pdf",
    filename,
    message:
      "Exportación PDF preparada a nivel de arquitectura. Descarga completa pendiente: falta transcript bot↔usuario y otros eventos documentados en gaps.",
    blockers: detail.exportBlockers,
    payload,
  };
}

export async function auditExportAttempt(input: {
  tripId: string;
  userId?: string | null;
  userEmail?: string | null;
}) {
  // Escritura ligera opcional vía service role si se desea trazar exports.
  void createAdminClient;
  void input;
}
