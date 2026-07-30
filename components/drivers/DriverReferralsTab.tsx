"use client";

import { useCallback, useEffect, useState } from "react";
import { FichaField } from "@/components/drivers/FichaFields";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buildWhatsAppShareUrl } from "@/lib/referrals/compute";
import type {
  DriverReferralsResponse,
  DriverReferralsSnapshot,
  ReferralListSort,
} from "@/lib/referrals/types";

type Props = {
  driverId: string;
  driverName?: string | null;
};

export function DriverReferralsTab({ driverId, driverName }: Props) {
  const [data, setData] = useState<DriverReferralsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ReferralListSort>("registered_desc");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [queryInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: query,
        sort,
        page: String(page),
        pageSize: "10",
      });
      const response = await fetch(
        `/api/drivers/${driverId}/referrals?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as DriverReferralsResponse;
      if (!response.ok || !payload.ok) {
        setData(null);
        setError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudieron cargar referidos",
        );
        return;
      }
      setData(payload.data);
    } catch {
      setData(null);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [driverId, query, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyInviteLink() {
    const url = data?.link?.inviteUrl;
    if (!url) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("No se pudo copiar al portapapeles");
    }
  }

  function shareWhatsAppReady() {
    const url = data?.link?.inviteUrl;
    if (!url) return;
    // Preparado para versión futura: no abre WhatsApp todavía.
    void buildWhatsAppShareUrl(url, driverName);
  }

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-surface-hover/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        {error}
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 block rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (!data.available) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
        <p className="font-display text-sm font-semibold text-foreground">
          Referidos no disponibles
        </p>
        <p className="mt-2 text-sm text-muted">
          {data.unavailableReason ??
            "Aplica las migraciones 040/041 del bot (referral_events / referral_attributions)."}
        </p>
      </div>
    );
  }

  const whatsappUrl = data.link
    ? buildWhatsAppShareUrl(data.link.inviteUrl, driverName)
    : null;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Enlace de invitación
        </h3>
        {data.link ? (
          <>
            <FichaField label="Código" value={data.link.code} />
            <FichaField label="Enlace" value={data.link.inviteUrl} />
            <FichaField
              label="Fecha de creación"
              value={data.link.createdAtLabel}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-hover"
              >
                📤 Compartir enlace
              </button>
              <button
                type="button"
                disabled
                title="Disponible en una versión futura"
                onClick={shareWhatsAppReady}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60"
                data-whatsapp-share-url={whatsappUrl ?? undefined}
              >
                WhatsApp (próximamente)
              </button>
            </div>
            {copied ? (
              <p className="text-xs font-medium text-success">
                Enlace copiado al portapapeles
              </p>
            ) : null}
            {copyError ? (
              <p className="text-xs text-danger">{copyError}</p>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-muted">
            Este conductor aún no tiene enlace de referido generado por REF-001.
          </p>
        )}
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <StatMini label="Personas invitadas" value={data.stats.invited} />
        <StatMini label="Usuarios registrados" value={data.stats.registered} />
        <StatMini label="Usuarios Beta" value={data.stats.beta} />
        <StatMini label="Usuarios Activos" value={data.stats.active} />
        <StatMini
          label="Primer servicio completado"
          value={data.stats.firstServiceCompleted}
          className="sm:col-span-2"
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            Listado de referidos
          </h3>
          <StatusBadge
            label={`${data.total} registro${data.total === 1 ? "" : "s"}`}
            tone="brand"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Buscar por nombre o estado"
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as ReferralListSort);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-surface-elevated px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:border-brand/60"
          >
            <option value="registered_desc">Registro ↓</option>
            <option value="registered_asc">Registro ↑</option>
            <option value="name_asc">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
            <option value="status_asc">Estado</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Fecha de registro</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Primer servicio</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-sm text-muted"
                    >
                      Sin referidos para este filtro.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border-subtle/80 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {item.registeredAtLabel}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          label={item.statusLabel}
                          tone={
                            item.status === "ACTIVE"
                              ? "success"
                              : item.status === "BETA"
                                ? "brand"
                                : item.status === "BLOCKED"
                                  ? "danger"
                                  : "neutral"
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-strong">
                        {item.firstServiceLabel}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={data.page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatMini({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface-elevated px-3 py-2.5 ${className}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
