"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toneForTripStatus } from "@/lib/dashboard/status";
import { SERVICE_FILTERS } from "@/lib/services/filters";
import type {
  ServiceFilter,
  ServiceSort,
  ServicesResponse,
  ServicesSnapshot,
} from "@/lib/services/types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 15_000;

export function ServicesView() {
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<ServicesSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [sort, setSort] = useState<ServiceSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setState((current) =>
          current === "ready" || current === "empty" ? current : "loading",
        );
      }

      try {
        const params = new URLSearchParams({
          filter,
          sort,
          q: query,
        });
        const response = await fetch(`/api/services?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as ServicesResponse;

        if (!response.ok || !payload.ok) {
          const message =
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo cargar servicios";
          setError(message);
          setData(null);
          setState("error");
          return;
        }

        setData(payload.data);
        setError(null);
        setState(payload.data.services.length > 0 ? "ready" : "empty");
      } catch {
        setError("Error de conexión con el servidor");
        setData(null);
        setState("error");
      } finally {
        setRefreshing(false);
      }
    },
    [filter, sort, query],
  );

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => {
      void load(false);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const countLabel = useMemo(() => {
    if (!data) return "—";
    return `${data.total} servicio${data.total === 1 ? "" : "s"}`;
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Centro de monitoreo de todos los servicios de WhatXia Mobility."
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
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {SERVICE_FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-border bg-surface-elevated text-muted-strong hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-xl">
            <span className="sr-only">Buscar servicios</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por pasajero, conductor, origen o destino"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <span>Orden</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as ServiceSort)
                }
                className="rounded-lg border border-border bg-surface-elevated px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand/60"
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
              </select>
            </label>
            <StatusBadge label={countLabel} tone="brand" />
          </div>
        </div>

        <p className="text-xs text-muted">
          Última actualización:{" "}
          <span className="font-medium text-muted-strong">
            {data?.fetchedAtLabel ?? "—"}
          </span>
          {" · "}
          auto cada 15 s
        </p>
      </div>

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? (
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      ) : null}
      {state === "empty" ? <EmptyBlock query={query} filter={filter} /> : null}
      {state === "ready" && data ? <ServicesTable data={data} /> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse border-b border-border-subtle last:border-0 bg-surface-hover/30"
          />
        ))}
      </div>
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
        {message ?? "No fue posible leer servicios desde Supabase."}
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

function EmptyBlock({
  query,
  filter,
}: {
  query: string;
  filter: ServiceFilter;
}) {
  const filterLabel =
    SERVICE_FILTERS.find((item) => item.id === filter)?.label ?? "Todos";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6">
      <h2 className="font-display text-sm font-semibold text-foreground">
        Sin datos
      </h2>
      <p className="mt-2 text-sm text-muted">
        {query
          ? `No hay servicios que coincidan con “${query}” en el filtro ${filterLabel}.`
          : `No hay servicios en el filtro ${filterLabel}.`}
      </p>
    </div>
  );
}

function ServicesTable({ data }: { data: ServicesSnapshot }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Pasajero</th>
              <th className="px-4 py-3 font-medium">Conductor</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((service) => (
              <tr
                key={service.id}
                className="border-b border-border-subtle/80 last:border-0 hover:bg-surface-hover/60"
              >
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {service.timeLabel}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={service.statusLabel}
                    tone={toneForTripStatus(service.status)}
                  />
                </td>
                <td className="px-4 py-3 text-muted-strong">
                  {service.passengerName}
                </td>
                <td className="px-4 py-3 text-muted-strong">
                  {service.driverName ?? "Sin asignar"}
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-2">{service.origin}</span>
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-2">{service.destination}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {service.fareLabel}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {service.elapsedLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
