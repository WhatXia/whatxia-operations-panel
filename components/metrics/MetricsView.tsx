"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  HorizontalBarList,
  VerticalBarChart,
} from "@/components/metrics/BarChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import { METRICS_RANGE_OPTIONS } from "@/lib/metrics/ranges";
import type {
  MetricsRangePreset,
  MetricsResponse,
  MetricsSnapshot,
} from "@/lib/metrics/types";

type UiState = "loading" | "ready" | "empty" | "error";

const REFRESH_MS = 60_000;

export function MetricsView() {
  const secureFetch = useSecureFetch();
  const [state, setState] = useState<UiState>("loading");
  const [data, setData] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [preset, setPreset] = useState<MetricsRangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

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
        const params = new URLSearchParams({ preset });
        if (preset === "custom") {
          if (customFrom) params.set("from", customFrom);
          if (customTo) params.set("to", customTo);
        }

        const response = await fetch(`/api/metrics?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as MetricsResponse;

        if (!response.ok || !payload.ok) {
          const message =
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo cargar métricas";
          setError(message);
          setData(null);
          setState("error");
          return;
        }

        setData(payload.data);
        setError(null);
        const hasData =
          payload.data.kpis.servicesMonth > 0 ||
          payload.data.totalsInRange.created > 0 ||
          payload.data.kpis.driversActive > 0;
        setState(hasData ? "ready" : "empty");
      } catch {
        setError("Error de conexión con el servidor");
        setData(null);
        setState("error");
      } finally {
        setRefreshing(false);
      }
    },
    [preset, customFrom, customTo],
  );

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => {
      void load(false);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const hourPoints = useMemo(() => {
    if (!data) return [];
    // Mostrar solo franja con actividad + márgenes, o todo el día si hay poco.
    const points = data.charts.byHourToday;
    const activeIdx = points
      .map((p, i) => (p.value > 0 ? i : -1))
      .filter((i) => i >= 0);
    if (activeIdx.length === 0) return points;
    const start = Math.max(0, Math.min(...activeIdx) - 1);
    const end = Math.min(23, Math.max(...activeIdx) + 1);
    return points.slice(start, end + 1);
  }, [data]);

  async function handleExport(format: "pdf" | "excel") {
    try {
      const response = await secureFetch("/api/metrics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          preset,
          from: customFrom || undefined,
          to: customTo || undefined,
        }),
      });
      const result = await response.json();
      setExportMessage(
        result.message ||
          (response.ok
            ? "Exportación registrada"
            : result.error || "No se pudo preparar la exportación"),
      );
    } catch {
      setExportMessage("Error al solicitar exportación");
    }
  }

  return (
    <div>
      <PageHeader
        title="Métricas"
        description="Indicadores ejecutivos de WhatXia Mobility a partir de datos reales."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport("excel")}
              disabled={!data}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-semibold text-muted-strong disabled:opacity-50"
              title="Disponible en un sprint futuro"
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={!data}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-semibold text-muted-strong disabled:opacity-50"
              title="Disponible en un sprint futuro"
            >
              Exportar PDF
            </button>
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
          {METRICS_RANGE_OPTIONS.map((option) => {
            const active = preset === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPreset(option.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-border bg-surface-elevated text-muted-strong hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted">
              Desde
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-border bg-surface-elevated px-2.5 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              Hasta
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 block rounded-lg border border-border bg-surface-elevated px-2.5 py-2 text-sm text-foreground"
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {data ? (
            <StatusBadge label={`Rango: ${data.range.label}`} tone="brand" />
          ) : null}
          <span className="text-xs text-muted">
            Última actualización:{" "}
            <span className="font-medium text-muted-strong">
              {data?.fetchedAtLabel ?? "—"}
            </span>
            {" · "}
            auto cada 60 s
          </span>
        </div>

        {exportMessage ? (
          <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-muted-strong">
            {exportMessage}
          </p>
        ) : null}
      </div>

      {state === "loading" ? <LoadingBlock /> : null}
      {state === "error" ? (
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      ) : null}
      {state === "empty" && data ? <EmptyBlock /> : null}
      {state === "ready" && data ? (
        <ReadyBlock data={data} hourPoints={hourPoints} />
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
        {message ?? "No fue posible leer métricas desde Supabase."}
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
        No hay servicios ni conductores suficientes para calcular métricas en
        este momento.
      </p>
    </div>
  );
}

function ReadyBlock({
  data,
  hourPoints,
}: {
  data: MetricsSnapshot;
  hourPoints: MetricsSnapshot["charts"]["byHourToday"];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Servicios hoy"
          value={data.kpis.servicesToday}
          accent
        />
        <StatCard
          label="Servicios esta semana"
          value={data.kpis.servicesWeek}
        />
        <StatCard
          label="Servicios este mes"
          value={data.kpis.servicesMonth}
        />
        <StatCard
          label="Tasa de finalización"
          value={data.kpis.completionRateLabel}
          hint={`Rango ${data.range.label}`}
        />
        <StatCard
          label="Tasa de cancelación"
          value={data.kpis.cancellationRateLabel}
          hint={`Rango ${data.range.label}`}
        />
        <StatCard
          label="Conductores activos"
          value={data.kpis.driversActive}
        />
        <StatCard
          label="Conductores disponibles"
          value={data.kpis.driversAvailable}
        />
        <StatCard
          label="Tiempo promedio de aceptación"
          value={data.kpis.avgAcceptanceLabel}
          hint={
            data.kpis.hasAcceptanceData
              ? "Proxy: inicio − creación (started_at)"
              : "Sin muestras con started_at"
          }
        />
        <StatCard
          label="Duración promedio del servicio"
          value={data.kpis.avgDurationLabel}
          hint={
            data.kpis.hasDurationData
              ? "finished_at − started_at"
              : "Sin muestras completadas con timestamps"
          }
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Servicios por hora (hoy)"
          subtitle="Volumen de creación por hora · America/Bogota"
        >
          <VerticalBarChart
            points={hourPoints}
            compactLabels
            emptyLabel="Sin servicios hoy"
          />
        </ChartCard>

        <ChartCard
          title="Servicios por día (últimos 30 días)"
          subtitle="Serie diaria de creación de servicios"
        >
          <VerticalBarChart
            points={data.charts.byDay30}
            compactLabels
            emptyLabel="Sin servicios en 30 días"
          />
        </ChartCard>

        <ChartCard
          title="Distribución por estado"
          subtitle={`Estados en rango: ${data.range.label}`}
        >
          <HorizontalBarList
            points={data.charts.byStatus}
            emptyLabel="Sin servicios en el rango"
          />
        </ChartCard>

        <ChartCard
          title="Conductores con más servicios"
          subtitle={`Top conductores en rango: ${data.range.label}`}
        >
          <HorizontalBarList
            points={data.charts.topDrivers}
            emptyLabel="Sin conductores con servicios en el rango"
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Tendencia de crecimiento de servicios"
        subtitle="Últimos 30 días · misma base que la serie diaria"
      >
        <VerticalBarChart
          points={data.charts.growthTrend}
          compactLabels
          emptyLabel="Sin tendencia disponible"
        />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
      {children}
    </section>
  );
}
