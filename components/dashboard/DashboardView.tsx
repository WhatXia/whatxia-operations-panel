"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  healthLabel,
  toneForHealth,
  toneForTripStatus,
} from "@/lib/dashboard/status";
import type {
  DashboardResponse,
  DashboardSnapshot,
} from "@/lib/dashboard/types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 30_000;

export function DashboardView() {
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<DashboardSnapshot | null>(null);
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
      const response = await fetch("/api/dashboard", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardResponse;

      if (!response.ok || !payload.ok) {
        const message =
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cargar el dashboard";
        setError(message);
        setData(null);
        setState("error");
        return;
      }

      setData(payload.data);
      setError(null);
      const hasActivity =
        payload.data.counts.createdToday > 0 ||
        payload.data.recentTrips.length > 0 ||
        payload.data.counts.driversActive > 0;
      setState(hasActivity ? "ready" : "empty");
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
        title="Estado de la operación"
        description="Vista en tiempo real del MVP WhatXia Mobility desde Supabase."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing || state === "loading"}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? "Actualizando..." : "Actualizar ahora"}
            </button>
            <Link
              href="/estado-sistema"
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-muted-strong transition hover:bg-surface-hover hover:text-foreground"
            >
              Ver estado del sistema
            </Link>
          </div>
        }
      />

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? <ErrorBlock message={error} onRetry={() => void load(true)} /> : null}
      {state === "empty" && data ? <EmptyBlock data={data} /> : null}
      {state === "ready" && data ? <ReadyBlock data={data} /> : null}
      {(state === "empty" || state === "ready") && data ? (
        <SystemBlock data={data} />
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
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
        {message ?? "No fue posible leer datos de Supabase."}
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

function EmptyBlock({ data }: { data: DashboardSnapshot }) {
  return (
    <div className="space-y-4">
      <MetricsGrid data={data} />
      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Sin datos operativos
        </h2>
        <p className="mt-2 text-sm text-muted">
          La conexión con Supabase está activa, pero no hay servicios ni
          conductores para mostrar todavía.
        </p>
      </div>
    </div>
  );
}

function ReadyBlock({ data }: { data: DashboardSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <StatusBadge
          label={`Supabase ${healthLabel(data.system.supabase.status)}`}
          tone={toneForHealth(data.system.supabase.status)}
        />
        <StatusBadge
          label={`Bot ${healthLabel(data.system.bot.status)}`}
          tone={toneForHealth(data.system.bot.status)}
        />
        <span className="text-xs text-muted">
          Actualizado {data.fetchedAtLabel} · auto cada 30 s
        </span>
      </div>

      <MetricsGrid data={data} />

      <section className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Actividad reciente
          </h2>
          <StatusBadge
            label={`${data.recentTrips.length} servicios`}
            tone="brand"
          />
        </div>
        {data.recentTrips.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            No hay servicios recientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Conductor</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="border-b border-border-subtle/80 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {trip.timeLabel}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={trip.statusLabel}
                        tone={toneForTripStatus(trip.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {trip.driverName ?? "Sin asignar"}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-muted">
                      <span className="line-clamp-2">{trip.origin}</span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-muted">
                      <span className="line-clamp-2">{trip.destination}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricsGrid({ data }: { data: DashboardSnapshot }) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Servicios creados hoy"
          value={data.counts.createdToday}
          hint={`Zona ${data.timezone}`}
          accent
        />
        <StatCard
          label="Servicios activos"
          value={data.counts.active}
          hint="No terminales ahora"
        />
        <StatCard
          label="Completados hoy"
          value={data.counts.completedToday}
        />
        <StatCard
          label="Cancelados hoy"
          value={data.counts.cancelledToday}
        />
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Conductores activos"
          value={data.counts.driversActive}
        />
        <StatCard
          label="Conductores disponibles"
          value={data.counts.driversAvailable}
        />
      </section>
    </>
  );
}

function SystemBlock({ data }: { data: DashboardSnapshot }) {
  return (
    <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border border-border bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Supabase</h3>
          <StatusBadge
            label={healthLabel(data.system.supabase.status)}
            tone={toneForHealth(data.system.supabase.status)}
          />
        </div>
        <p className="mt-2 text-xs text-muted">{data.system.supabase.detail}</p>
      </article>
      <article className="rounded-xl border border-border bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Bot</h3>
          <StatusBadge
            label={healthLabel(data.system.bot.status)}
            tone={toneForHealth(data.system.bot.status)}
          />
        </div>
        <p className="mt-2 text-xs text-muted">{data.system.bot.detail}</p>
      </article>
      <article className="rounded-xl border border-border bg-surface-elevated p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Última sincronización
        </h3>
        <p className="mt-2 text-xs text-muted">{data.system.lastSyncLabel}</p>
      </article>
      <article className="rounded-xl border border-border bg-surface-elevated p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Hora de actualización
        </h3>
        <p className="mt-2 font-mono text-xs text-muted-strong">
          {data.fetchedAtLabel}
        </p>
      </article>
    </section>
  );
}
