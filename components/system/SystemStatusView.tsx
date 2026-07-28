"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { healthEmoji, healthTone } from "@/lib/system/format";
import type {
  SystemEvent,
  SystemStatusResponse,
  SystemStatusSnapshot,
} from "@/lib/system/types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 30_000;

function eventTone(
  severity: SystemEvent["severity"],
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (severity) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}

export function SystemStatusView() {
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<SystemStatusSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setState((current) =>
        current === "ready" || current === "empty" ? current : "loading",
      );
    }

    try {
      const response = await fetch("/api/system-status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as SystemStatusResponse;

      if (!response.ok || !payload.ok) {
        const message =
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cargar el estado del sistema";
        setError(message);
        setData(null);
        setState("error");
        return;
      }

      setData(payload.data);
      setError(null);
      const hasContent =
        payload.data.components.length > 0 ||
        payload.data.events.length > 0 ||
        payload.data.indicators.servicesToday > 0 ||
        payload.data.indicators.driversActive > 0;
      setState(hasContent ? "ready" : "empty");
    } catch {
      setError("Error de conexión con el servidor");
      setData(null);
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => {
      void load(false);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Estado del Sistema"
        description="Centro de monitoreo técnico de la plataforma WhatXia."
        actions={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing || state === "loading"}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {refreshing ? "Actualizando..." : "Actualizar ahora"}
          </button>
        }
      />

      {data ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={`General: ${data.overallLabel}`}
            tone={healthTone(data.overall)}
          />
          <span className="text-xs text-muted">
            Última actualización:{" "}
            <span className="font-medium text-muted-strong">
              {data.fetchedAtLabel}
            </span>
            {" · "}
            auto cada 30 s
          </span>
        </div>
      ) : null}

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? (
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      ) : null}
      {state === "empty" && data ? <EmptyBlock /> : null}
      {state === "ready" && data ? <ReadyBlock data={data} /> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-surface-elevated"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-elevated" />
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
      <h2 className="font-display text-base font-semibold text-danger">
        Error de conexión
      </h2>
      <p className="mt-2 text-sm text-muted-strong">
        {message ?? "No fue posible leer el estado del sistema."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-semibold text-foreground"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyBlock() {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6">
      <h2 className="font-display text-sm font-semibold text-foreground">
        Sin datos
      </h2>
      <p className="mt-2 text-sm text-muted">
        La conexión está activa, pero no hay señales operativas para mostrar.
      </p>
    </div>
  );
}

function ReadyBlock({ data }: { data: SystemStatusSnapshot }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
          Estado general
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.components.map((component) => (
            <article
              key={component.id}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {component.label}
                </h3>
                <span className="text-base leading-none" aria-hidden>
                  {healthEmoji(component.status)}
                </span>
              </div>
              <div className="mt-3">
                <StatusBadge
                  label={component.statusLabel}
                  tone={healthTone(component.status)}
                />
              </div>
              <p className="mt-3 text-xs text-muted">{component.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">
              Actividad del sistema
            </h2>
            <p className="text-xs text-muted">
              Eventos derivados de trips, sesiones y autenticación
            </p>
          </div>
          <StatusBadge
            label={`${data.events.length} eventos`}
            tone="info"
          />
        </div>
        {data.events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            No hay eventos recientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Detalle</th>
                  <th className="px-4 py-3 font-medium">Severidad</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-border-subtle/80 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {event.timeLabel}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {event.title}
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-muted">
                      <span className="line-clamp-2">{event.detail}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={event.severity}
                        tone={eventTone(event.severity)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
          Información técnica
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TechCard
            label="Última sincronización"
            value={data.tech.lastSyncLabel}
            hint={data.tech.lastSyncAt}
          />
          <TechCard
            label="Hora del servidor"
            value={data.tech.serverTimeLabel}
            hint={data.tech.timezone}
          />
          <TechCard
            label="Versión Operations Center"
            value={`v${data.tech.opsVersion}`}
          />
          <TechCard
            label="Versión del Bot"
            value={`v${data.tech.botVersion}`}
          />
          <TechCard
            label="Tiempo desde última actualización"
            value={data.tech.sinceLastUpdateLabel}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
          Indicadores
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Servicios hoy"
            value={data.indicators.servicesToday}
            accent
          />
          <StatCard
            label="Conductores activos"
            value={data.indicators.driversActive}
          />
          <StatCard
            label="Usuarios autenticados"
            value={data.indicators.authenticatedUsers}
          />
          <StatCard
            label="Conexiones activas"
            value={data.indicators.activeConnections}
            hint="Sesiones bot recientes + túneles activos"
          />
        </div>
      </section>
    </div>
  );
}

function TechCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-lg font-semibold text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 break-all font-mono text-[11px] text-muted">{hint}</p>
      ) : null}
    </article>
  );
}
