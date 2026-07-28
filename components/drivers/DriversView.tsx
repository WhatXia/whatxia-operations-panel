"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DriverDetailDrawer } from "@/components/drivers/DriverDetailDrawer";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DRIVER_FILTERS } from "@/lib/drivers/filters";
import type {
  DriverFilter,
  DriverListItem,
  DriverSort,
  DriversResponse,
  DriversSnapshot,
} from "@/lib/drivers/types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 15_000;

export function DriversView() {
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<DriversSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DriverFilter>("all");
  const [sort, setSort] = useState<DriverSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        const response = await fetch(`/api/drivers?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as DriversResponse;

        if (!response.ok || !payload.ok) {
          const message =
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo cargar conductores";
          setError(message);
          setData(null);
          setState("error");
          return;
        }

        setData(payload.data);
        setError(null);
        setState(payload.data.drivers.length > 0 ? "ready" : "empty");
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
    return `${data.total} conductor${data.total === 1 ? "" : "es"}`;
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Conductores"
        description="Centro de monitoreo de la fuerza operativa de WhatXia Mobility."
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

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {DRIVER_FILTERS.map((item) => {
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
            <span className="sr-only">Buscar conductores</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por nombre, documento, placa o teléfono"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <span>Orden</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as DriverSort)}
                className="rounded-lg border border-border bg-surface-elevated px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand/60"
              >
                <option value="newest">Más recientes</option>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
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
          {!data?.hasBalanceColumn ? (
            <span className="text-muted"> · saldo no disponible en esquema</span>
          ) : null}
        </p>
      </div>

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? (
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      ) : null}
      {state === "empty" ? <EmptyBlock query={query} filter={filter} /> : null}
      {state === "ready" && data ? (
        <DriversTable
          drivers={data.drivers}
          onSelect={(id) => setSelectedId(id)}
        />
      ) : null}

      <DriverDetailDrawer
        driverId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse border-b border-border-subtle last:border-0 bg-surface-hover/30"
        />
      ))}
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
        {message ?? "No fue posible leer conductores desde Supabase."}
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
  filter: DriverFilter;
}) {
  const filterLabel =
    DRIVER_FILTERS.find((item) => item.id === filter)?.label ?? "Todos";
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6">
      <h2 className="font-display text-sm font-semibold text-foreground">
        Sin datos
      </h2>
      <p className="mt-2 text-sm text-muted">
        {query
          ? `No hay conductores que coincidan con “${query}” en el filtro ${filterLabel}.`
          : `No hay conductores en el filtro ${filterLabel}.`}
      </p>
    </div>
  );
}

function DriversTable({
  drivers,
  onSelect,
}: {
  drivers: DriverListItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Vehículo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Disponibilidad</th>
              <th className="px-4 py-3 font-medium">Última actividad</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Abrir ficha</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr
                key={driver.id}
                className="cursor-pointer border-b border-border-subtle/80 last:border-0 hover:bg-surface-hover/60"
                onClick={() => onSelect(driver.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(driver.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Abrir ficha de ${driver.name}`}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {driver.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-strong">
                  {driver.documentId || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-strong">
                  {driver.phoneMasked}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {driver.plate}
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-2">{driver.vehicleLabel}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={driver.statusLabel}
                    tone={
                      driver.adminStatus === "active"
                        ? "success"
                        : driver.adminStatus === "suspended"
                          ? "warning"
                          : "danger"
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={driver.availabilityLabel}
                    tone={
                      driver.availability === "available" ? "brand" : "warning"
                    }
                  />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {driver.lastActivityLabel}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {driver.balanceLabel}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold text-brand">
                    Ver ficha
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
