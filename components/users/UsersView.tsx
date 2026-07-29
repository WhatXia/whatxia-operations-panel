"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PassengerDetailDrawer,
  PassengerQuickActions,
  PassengerStatusBadge,
} from "@/components/users/PassengerDetailDrawer";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PassengersResponse, PassengersSnapshot } from "@/lib/passengers/api-types";
import { PASSENGER_FILTERS } from "@/lib/passengers/filters";
import {
  formatPassengerInteractionLabel,
  formatPassengerRegisteredLabel,
  formatPassengerPhone,
} from "@/lib/passengers/format";
import type {
  PassengerListItem,
  PassengerStatusAction,
  PassengerStatusFilter,
} from "@/lib/passengers/types";
import type { PassengerStatusUpdateResponse } from "@/lib/passengers/api-types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 15_000;

export function UsersView({ canMutate }: { canMutate: boolean }) {
  const secureFetch = useSecureFetch();
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<PassengersSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PassengerStatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

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
          q: query,
        });
        const response = await fetch(`/api/passengers?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as PassengersResponse;

        if (!response.ok || !payload.ok) {
          const message =
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo cargar usuarios";
          setError(message);
          setData(null);
          setState("error");
          return;
        }

        setData(payload.data);
        setError(null);
        setState(payload.data.passengers.length > 0 ? "ready" : "empty");
      } catch {
        setError("Error de conexión con el servidor");
        setData(null);
        setState("error");
      } finally {
        setRefreshing(false);
      }
    },
    [filter, query],
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
    return `${data.total} usuario${data.total === 1 ? "" : "s"}`;
  }, [data]);

  async function runRowAction(
    passengerId: string,
    action: PassengerStatusAction,
  ) {
    if (!canMutate) return;
    setRowBusyId(passengerId);
    try {
      const response = await secureFetch(`/api/passengers/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as PassengerStatusUpdateResponse;
      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cambiar el estado",
        );
        return;
      }
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Usuarios finales de WhatXia por WhatsApp (Pioneros, Beta, Active, Blocked)."
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
          {PASSENGER_FILTERS.map((item) => {
            const active = filter === item.id;
            const count = data?.counts[item.id];
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
                {typeof count === "number" ? (
                  <span className="ml-1.5 opacity-70">({count})</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-xl">
            <span className="sr-only">Buscar usuarios</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por nombre o teléfono"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <StatusBadge label={countLabel} tone="brand" />
        </div>

        <p className="text-xs text-muted">
          Última actualización:{" "}
          <span className="font-medium text-muted-strong">
            {data?.fetchedAtLabel ?? "—"}
          </span>
          {" · "}
          auto cada 15 s
          {!canMutate ? (
            <span className="text-muted"> · solo lectura</span>
          ) : null}
        </p>
      </div>

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? (
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      ) : null}
      {state === "empty" ? <EmptyBlock query={query} filter={filter} /> : null}
      {state === "ready" && data ? (
        <UsersTable
          passengers={data.passengers}
          canMutate={canMutate}
          rowBusyId={rowBusyId}
          onSelect={(id) => setSelectedId(id)}
          onAction={(id, action) => void runRowAction(id, action)}
        />
      ) : null}

      <PassengerDetailDrawer
        passengerId={selectedId}
        canMutate={canMutate}
        onClose={() => setSelectedId(null)}
        onStatusChanged={() => void load(true)}
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
        {message ?? "No fue posible leer usuarios desde Supabase."}
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
  filter: PassengerStatusFilter;
}) {
  const filterLabel =
    PASSENGER_FILTERS.find((item) => item.id === filter)?.label ?? "Todos";
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6">
      <h2 className="font-display text-sm font-semibold text-foreground">
        Sin datos
      </h2>
      <p className="mt-2 text-sm text-muted">
        {query
          ? `No hay usuarios que coincidan con “${query}” en el filtro ${filterLabel}.`
          : `No hay usuarios en el filtro ${filterLabel}.`}
      </p>
    </div>
  );
}

function UsersTable({
  passengers,
  canMutate,
  rowBusyId,
  onSelect,
  onAction,
}: {
  passengers: PassengerListItem[];
  canMutate: boolean;
  rowBusyId: string | null;
  onSelect: (id: string) => void;
  onAction: (id: string, action: PassengerStatusAction) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha de registro</th>
              <th className="px-4 py-3 font-medium">Última interacción</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((passenger) => (
              <tr
                key={passenger.id}
                className="cursor-pointer border-b border-border-subtle/80 last:border-0 hover:bg-surface-hover/60"
                onClick={() => onSelect(passenger.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(passenger.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Abrir ficha de ${passenger.name}`}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {passenger.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-strong">
                  {formatPassengerPhone(passenger.phone)}
                </td>
                <td className="px-4 py-3">
                  <PassengerStatusBadge status={passenger.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {formatPassengerRegisteredLabel(passenger.registeredAt)}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {formatPassengerInteractionLabel(passenger.lastInteractionAt)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <PassengerQuickActions
                    status={passenger.status}
                    canMutate={canMutate}
                    busy={rowBusyId === passenger.id}
                    onAction={(action) => onAction(passenger.id, action)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
