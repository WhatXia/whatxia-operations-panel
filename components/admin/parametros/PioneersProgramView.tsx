"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import { PIONEERS_USERS_CODE } from "@/lib/launch-programs/types";
import type { LaunchProgramDetail } from "@/lib/launch-programs/types";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function PioneersProgramView() {
  const secureFetch = useSecureFetch();
  const [data, setData] = useState<LaunchProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxQuota, setMaxQuota] = useState("");
  const [autoActivateOnEnd, setAutoActivateOnEnd] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [activationMessage, setActivationMessage] = useState("");

  const syncForm = useCallback((detail: LaunchProgramDetail) => {
    setStartsAt(toDatetimeLocalValue(detail.startsAt));
    setEndsAt(toDatetimeLocalValue(detail.endsAt));
    setMaxQuota(detail.maxQuota != null ? String(detail.maxQuota) : "");
    setAutoActivateOnEnd(detail.autoActivateOnEnd);
    setWelcomeMessage(detail.welcomeMessage ?? "");
    setActivationMessage(detail.activationMessage ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/launch-programs/${PIONEERS_USERS_CODE}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        data?: LaunchProgramDetail;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setData(null);
        setError(payload.error ?? "No se pudo cargar el programa Pioneros");
        return;
      }
      setData(payload.data);
      syncForm(payload.data);
    } catch {
      setData(null);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [syncForm]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveFields() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const quotaRaw = maxQuota.trim();
      const maxQuotaValue =
        quotaRaw === "" ? null : Number.parseInt(quotaRaw, 10);
      if (quotaRaw !== "" && (!Number.isFinite(maxQuotaValue) || maxQuotaValue! <= 0)) {
        setError("Cupo máximo inválido");
        return;
      }

      const response = await secureFetch(
        `/api/admin/launch-programs/${PIONEERS_USERS_CODE}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: fromDatetimeLocalValue(startsAt),
            endsAt: fromDatetimeLocalValue(endsAt),
            maxQuota: maxQuotaValue,
            autoActivateOnEnd,
            welcomeMessage: welcomeMessage.trim() || null,
            activationMessage: activationMessage.trim() || null,
          }),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        data?: LaunchProgramDetail;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.error ?? "No se pudo guardar");
        return;
      }
      setData(payload.data);
      syncForm(payload.data);
      setSuccess("Parámetros guardados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function setProgramActive(nextActive: boolean) {
    if (!data) return;

    if (!nextActive && data.isActive) {
      const confirmed = window.confirm(
        "Al desactivar Pioneros, todos los usuarios PIONEER pasarán a ACTIVE y se encolará el mensaje de activación (si está configurado). ¿Continuar?",
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await secureFetch(
        `/api/admin/launch-programs/${PIONEERS_USERS_CODE}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            nextActive
              ? { isActive: true }
              : { isActive: false, deactivate: true },
          ),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        data?: LaunchProgramDetail;
        error?: string;
        deactivate?: {
          activatedCount: number;
          messagesSent?: number;
          alreadyInactive?: boolean;
        };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.error ?? "No se pudo cambiar el estado");
        return;
      }
      setData(payload.data);
      syncForm(payload.data);
      if (nextActive) {
        setSuccess("Programa Pioneros activado");
      } else {
        const n = payload.deactivate?.activatedCount ?? 0;
        const sent = payload.deactivate?.messagesSent ?? 0;
        setSuccess(
          `Programa desactivado. ${n} usuario(s) PIONEER → ACTIVE.${
            sent > 0 ? ` Mensajes enviados: ${sent}.` : ""
          }`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pioneros"
        description="Programa de lanzamiento para usuarios finales. El bot lee esta configuración desde la base de datos."
        actions={
          <Link
            href="/admin/parametros/programas-lanzamiento"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-strong hover:bg-surface-hover"
          >
            ← Programas
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface-elevated"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </div>
      ) : null}

      {data && !loading ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Estado del programa
                </p>
                <div className="mt-2">
                  <StatusBadge
                    label={data.isActive ? "🟢 Activo" : "⚪ Inactivo"}
                    tone={data.isActive ? "success" : "neutral"}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void setProgramActive(!data.isActive)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                  data.isActive
                    ? "border border-border text-muted-strong hover:bg-surface-hover"
                    : "bg-brand text-brand-ink hover:bg-brand-hover"
                }`}
              >
                {data.isActive ? "Desactivar programa" : "Activar programa"}
              </button>
            </div>
            {data.massActivatedAt ? (
              <p className="mt-3 text-xs text-muted">
                Última activación masiva:{" "}
                <span className="font-medium text-muted-strong">
                  {data.massActivatedAtLabel}
                </span>
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
              Dashboard
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Estado"
                value={data.dashboard.isActive ? "Activo" : "Inactivo"}
                accent={data.dashboard.isActive}
              />
              <StatCard
                label="Cupos utilizados"
                value={data.dashboard.quotaLabel}
                hint="Pioneros registrados / cupo"
              />
              <StatCard
                label="Pendientes por activar"
                value={data.dashboard.pendingActivation}
                hint="Usuarios en estado PIONEER"
              />
              <StatCard
                label="Inicio"
                value={data.dashboard.startsAtLabel}
              />
              <StatCard
                label="Finalización"
                value={data.dashboard.endsAtLabel}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Parámetros
            </h2>

            <label className="block text-sm">
              <span className="text-xs font-medium text-muted">
                Fecha de inicio
              </span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-muted">
                Fecha de finalización
              </span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-muted">
                Cupo máximo de pioneros
              </span>
              <input
                type="number"
                min={1}
                value={maxQuota}
                onChange={(e) => setMaxQuota(e.target.value)}
                placeholder="Sin límite"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
              />
            </label>

            <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <p className="text-xs font-medium text-muted">
                Pioneros registrados
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-foreground">
                {data.dashboard.registeredPioneers}
              </p>
              <p className="text-xs text-muted">Solo lectura · estado PIONEER</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={autoActivateOnEnd}
                onChange={(e) => setAutoActivateOnEnd(e.target.checked)}
              />
              Activación automática al finalizar (Sí/No)
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-muted">
                Mensaje de bienvenida
              </span>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
              />
              <span className="mt-1 block text-[11px] text-muted">
                Variables: {"{{nombre}}"} / {"{{name}}"}
              </span>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-muted">
                Mensaje de activación
              </span>
              <textarea
                value={activationMessage}
                onChange={(e) => setActivationMessage(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand/60"
              />
              <span className="mt-1 block text-[11px] text-muted">
                Se envía al desactivar el programa (PIONEER → ACTIVE).
              </span>
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveFields()}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar parámetros"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
