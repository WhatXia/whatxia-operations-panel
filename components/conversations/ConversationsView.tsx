"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toneForTripStatus } from "@/lib/dashboard/status";
import { RANGE_OPTIONS } from "@/lib/conversations/filters";
import type {
  ConversationListItem,
  ConversationListSnapshot,
  ConversationsListResponse,
  ConversationSort,
} from "@/lib/conversations/types";

const REFRESH_MS = 20_000;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "SEARCHING", label: "Buscando" },
  { value: "ASSIGNED", label: "Asignado" },
  { value: "ETA_INFORMED", label: "ETA informado" },
  { value: "DRIVER_ARRIVED", label: "En sitio" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "cancelled_no_driver", label: "Sin conductor" },
];

const TERMINAL = new Set([
  "COMPLETED",
  "CANCELLED",
  "cancelled_no_driver",
]);

/** Formato corto solo para presentación en tabla. */
function formatShortDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return "< 1 min";
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function formatShortAgo(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  return formatShortDuration(now.getTime() - then);
}

function formatShortElapsed(item: ConversationListItem, now = new Date()) {
  const start = new Date(item.createdAt).getTime();
  if (Number.isNaN(start)) return "—";
  const end =
    TERMINAL.has(item.serviceStatus) && item.lastActivityAt
      ? new Date(item.lastActivityAt).getTime()
      : now.getTime();
  if (Number.isNaN(end)) return "—";
  return formatShortDuration(end - start);
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ConversationsView() {
  const router = useRouter();
  const [data, setData] = useState<ConversationListSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("today");
  const [status, setStatus] = useState("");
  const [driver, setDriver] = useState("");
  const [passenger, setPassenger] = useState("");
  const [phone, setPhone] = useState("");
  const [tripId, setTripId] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ConversationSort>("newest");
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        preset,
        sort,
      });
      if (status) params.set("status", status);
      if (driver) params.set("driver", driver);
      if (passenger) params.set("passenger", passenger);
      if (phone) params.set("phone", phone);
      if (tripId) params.set("tripId", tripId);
      if (query) params.set("q", query);

      const response = await fetch(`/api/conversations?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ConversationsListResponse;
      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok ? payload.error : "No se pudieron cargar conversaciones",
        );
        setData(null);
        return;
      }
      setData(payload.data);
      setNow(new Date());
      setError(null);
    } catch {
      setError("Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [preset, status, driver, passenger, phone, tripId, query, sort]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  function openInspector(item: ConversationListItem) {
    router.push(`/conversaciones/${item.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Conversation Inspector"
        description="Reconstrucción operativa de servicios y conversaciones a partir de datos reales en Supabase."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
          >
            Actualizar
          </button>
        }
      />

      <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          placeholder="Conductor"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          value={passenger}
          onChange={(e) => setPassenger(e.target.value)}
          placeholder="Pasajero"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Número telefónico"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          value={tripId}
          onChange={(e) => setTripId(e.target.value)}
          placeholder="ID del servicio"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ConversationSort)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="activity">Última actividad</option>
        </select>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {data?.gaps?.length ? (
        <details className="mb-4 rounded-xl border border-border bg-surface-elevated p-3 text-xs text-muted">
          <summary className="cursor-pointer font-semibold text-muted-strong">
            Datos aún no disponibles en esta versión ({data.gaps.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.gaps.map((gap) => (
              <li key={gap.id}>
                <span className="text-foreground">{gap.label}:</span> {gap.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="rounded-xl border border-border bg-surface-elevated">
        {loading && !data ? (
          <p className="p-4 text-sm text-muted">Cargando conversaciones...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            No hay conversaciones/servicios para los filtros seleccionados.
          </p>
        ) : (
          <div className="wx-scrollbar overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border-subtle">
                  <th className="whitespace-nowrap px-3 py-3">Fecha</th>
                  <th className="whitespace-nowrap px-3 py-3">Hora</th>
                  <th className="whitespace-nowrap px-3 py-3">ID servicio</th>
                  <th className="whitespace-nowrap px-3 py-3">Pasajero</th>
                  <th className="whitespace-nowrap px-3 py-3">WhatsApp</th>
                  <th className="whitespace-nowrap px-3 py-3">Estado servicio</th>
                  <th className="whitespace-nowrap px-3 py-3">
                    Estado conversación
                  </th>
                  <th className="whitespace-nowrap px-3 py-3">Conductor</th>
                  <th className="whitespace-nowrap px-3 py-3">Última actividad</th>
                  <th className="whitespace-nowrap px-3 py-3">Transcurrido</th>
                  <th className="w-14 whitespace-nowrap px-2 py-3 text-center">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => openInspector(item)}
                    className="cursor-pointer border-b border-border-subtle/80 last:border-0 hover:bg-surface-hover/40"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                      {item.dateLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                      {item.timeLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-brand">
                      {item.shortId}
                    </td>
                    <td
                      className="max-w-[160px] truncate whitespace-nowrap px-3 py-3"
                      title={item.passengerName}
                    >
                      {item.passengerName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                      {item.passengerPhone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge
                        label={item.serviceStatusLabel}
                        tone={toneForTripStatus(item.serviceStatus)}
                      />
                    </td>
                    <td
                      className="max-w-[160px] truncate whitespace-nowrap px-3 py-3 text-xs"
                      title={item.conversationStatus}
                    >
                      {item.conversationStatusAvailable ? (
                        item.conversationStatus
                      ) : (
                        <span className="text-muted italic">
                          {item.conversationStatus}
                        </span>
                      )}
                    </td>
                    <td
                      className="max-w-[160px] truncate whitespace-nowrap px-3 py-3"
                      title={item.driverName || "Información no disponible"}
                    >
                      {item.driverName || (
                        <span className="text-muted italic">
                          Información no disponible
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                      {formatShortAgo(item.lastActivityAt, now)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">
                      {formatShortElapsed(item, now)}
                    </td>
                    <td className="w-14 px-2 py-3 text-center">
                      <Link
                        href={`/conversaciones/${item.id}`}
                        title="Inspeccionar conversación"
                        aria-label="Inspeccionar conversación"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-brand transition-colors hover:bg-brand-soft"
                      >
                        <EyeIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data ? (
        <p className="mt-3 text-xs text-muted">
          {data.total} registro(s) · TZ {data.timezone}
        </p>
      ) : null}
    </div>
  );
}
