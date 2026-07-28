"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import { toneForTripStatus } from "@/lib/dashboard/status";
import type {
  ConversationDetail,
  ConversationDetailResponse,
  SidePanelField,
} from "@/lib/conversations/types";

function FieldList({ title, fields }: { title: string; fields: SidePanelField[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </h3>
      <dl className="mt-3 space-y-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-[11px] text-muted">{field.label}</dt>
            <dd
              className={`text-sm ${
                field.available ? "text-foreground" : "italic text-muted"
              }`}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function bubbleClass(origin: string) {
  switch (origin) {
    case "passenger":
      return "ml-auto bg-[#005c4b] text-white";
    case "driver":
      return "mr-auto bg-[#1f2c34] text-foreground border border-border";
    case "bot":
      return "mr-auto bg-surface border border-border text-muted";
    default:
      return "mx-auto bg-surface-hover text-muted text-center";
  }
}

export function ConversationInspectorView({ id }: { id: string }) {
  const secureFetch = useSecureFetch();
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ConversationDetailResponse;
      if (!response.ok || !payload.ok) {
        setError(!payload.ok ? payload.error : "No se pudo cargar la inspección");
        setData(null);
        return;
      }
      setData(payload.data);
      setError(null);
    } catch {
      setError("Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport() {
    setExportMessage(null);
    try {
      const response = await secureFetch(`/api/conversations/${id}/export`, {
        method: "POST",
      });
      const payload = await response.json();
      setExportMessage(
        payload.message ||
          payload.error ||
          (response.ok
            ? "Exportación preparada"
            : "No se pudo preparar la exportación"),
      );
    } catch {
      setExportMessage("Error al exportar");
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted">Cargando inspección...</p>;
  }

  if (error || !data) {
    return (
      <div>
        <p className="mb-4 text-sm text-danger">{error || "Sin datos"}</p>
        <Link href="/conversaciones" className="text-sm text-brand">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Inspección ${data.shortId}`}
        description="Vista reconstruida con datos reales. Lo no persistido se marca como no disponible."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/conversaciones"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Volver
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Exportar conversación a PDF
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge
          label={data.list.serviceStatusLabel}
          tone={toneForTripStatus(data.list.serviceStatus)}
        />
        <span className="text-xs text-muted">
          {data.list.dateLabel} · {data.list.timeLabel} · {data.list.passengerName}
        </span>
      </div>

      {exportMessage ? (
        <p className="mb-4 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-muted-strong">
          {exportMessage}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {/* WhatsApp-like pane */}
          <section className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-[#0b141a] px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Conversación
              </p>
              <p className="text-xs text-muted">
                Burbujas reales: pasajero ↔ conductor (túnel). Bot: no persistido.
              </p>
            </div>
            <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto bg-[#0b141a] p-4">
              {data.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow ${bubbleClass(msg.origin)}`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide opacity-80">
                    <span>{msg.originLabel}</span>
                    <span>{msg.dateLabel}</span>
                    <span>{msg.timeLabel}</span>
                    <span>{msg.statusLabel}</span>
                  </div>
                  <p className={msg.available ? "" : "italic opacity-80"}>
                    {msg.content}
                  </p>
                  {msg.note ? (
                    <p className="mt-1 text-[11px] opacity-70">{msg.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="font-display text-base font-semibold">
              Línea de tiempo
            </h2>
            <ol className="mt-3 space-y-3">
              {data.timeline.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-l border-border-subtle pl-3"
                >
                  <span className="font-mono text-xs text-brand">
                    {event.timeLabel}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        event.source === "gap"
                          ? "italic text-muted"
                          : "text-foreground"
                      }`}
                    >
                      {event.title}
                    </p>
                    {event.detail ? (
                      <p className="text-xs text-muted">{event.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Audit */}
          <section className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="font-display text-base font-semibold">
              Auditoría relacionada
            </h2>
            {data.audit.length === 0 ? (
              <p className="mt-2 text-sm italic text-muted">
                Información no disponible — no hay audit_logs vinculados a este
                ID de servicio.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted">
                    <tr className="border-b border-border-subtle">
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Hora</th>
                      <th className="px-2 py-2">Usuario</th>
                      <th className="px-2 py-2">Acción</th>
                      <th className="px-2 py-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border-subtle/70"
                      >
                        <td className="px-2 py-2 text-xs">{row.dateLabel}</td>
                        <td className="px-2 py-2 font-mono text-xs">
                          {row.timeLabel}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {row.userEmail || "—"}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">
                          {row.action}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge
                            label={row.result}
                            tone={row.result === "OK" ? "success" : "danger"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <details className="rounded-xl border border-border bg-surface-elevated p-4 text-xs text-muted">
            <summary className="cursor-pointer font-semibold text-muted-strong">
              Gaps documentados para sprints futuros
            </summary>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {data.gaps.map((gap) => (
                <li key={gap.id}>
                  <p className="text-foreground">{gap.label}</p>
                  <p>{gap.reason}</p>
                  <p className="text-muted-strong">Futuro: {gap.futureNeed}</p>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <aside className="space-y-3">
          <FieldList title="Pasajero" fields={data.sidePanel.passenger} />
          <FieldList title="Conductor / vehículo" fields={data.sidePanel.driver} />
          <FieldList title="Servicio" fields={data.sidePanel.service} />
        </aside>
      </div>
    </div>
  );
}
