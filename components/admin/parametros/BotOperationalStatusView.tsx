"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import {
  BOT_OPERATIONAL_STATUS_LABELS,
  DEFAULT_CMS_MESSAGE_CODE,
  type BotOperationalStatus,
  type BotOperationalStatusCode,
} from "@/lib/bot-operational-status/types";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BotOperationalStatusView() {
  const secureFetch = useSecureFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [meta, setMeta] = useState<BotOperationalStatus | null>(null);
  const [status, setStatus] = useState<BotOperationalStatusCode>("ACTIVE");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/bot-operational-status", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: BotOperationalStatus;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setMeta(null);
        setError(payload.error ?? "No se pudo cargar el estado del bot");
        return;
      }
      setMeta(payload.data);
      setStatus(payload.data.status);
      setMessage(payload.data.maintenanceMessage);
    } catch {
      setMeta(null);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await secureFetch("/api/admin/bot-operational-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          maintenanceMessage: message,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: BotOperationalStatus;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.error ?? "No se pudo guardar");
        return;
      }
      setMeta(payload.data);
      setStatus(payload.data.status);
      setMessage(payload.data.maintenanceMessage);
      setSuccess(
        payload.data.status === "MAINTENANCE"
          ? "Bot en mantenimiento. Los usuarios solo reciben el mensaje configurado."
          : "Bot activo. Operación normal restaurada de inmediato.",
      );
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const isMaintenance = status === "MAINTENANCE";

  return (
    <div>
      <PageHeader
        title="Estado del Bot"
        description="Activa o pon en mantenimiento el bot WhatsApp sin reiniciar servicios. Misma configuración SYS-001 que consulta el MVP."
        actions={
          <Link
            href="/admin/parametros/sistema"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            ← Sistema
          </Link>
        }
      />

      <p className="mb-4 text-xs text-muted">
        Parámetros / Sistema / Estado del Bot
      </p>

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando estado operativo…</p>
      ) : null}

      {!loading && meta ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-wide text-muted">
                Estado actual
              </p>
              <p className="mt-2 text-2xl">
                {meta.status === "MAINTENANCE" ? "🟡" : "🟢"}
              </p>
              <div className="mt-1">
                <StatusBadge
                  label={BOT_OPERATIONAL_STATUS_LABELS[meta.status]}
                  tone={meta.status === "MAINTENANCE" ? "warning" : "success"}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-wide text-muted">
                Última modificación
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatWhen(meta.updatedAt)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {meta.updatedByEmail || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-wide text-muted">
                Código CMS
              </p>
              <p className="mt-2 font-mono text-sm text-brand">
                {meta.cmsMessageCode || DEFAULT_CMS_MESSAGE_CODE}
              </p>
              <p className="mt-1 text-xs text-muted">
                Se sincroniza al guardar
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="mb-3 text-sm font-medium">Interruptor</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setStatus("ACTIVE")}
                aria-pressed={!isMaintenance}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  !isMaintenance
                    ? "bg-success/20 text-success border border-success/40"
                    : "border border-border bg-background text-muted-strong"
                }`}
              >
                🟢 Activo
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setStatus("MAINTENANCE")}
                aria-pressed={isMaintenance}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isMaintenance
                    ? "bg-warning/20 text-warning border border-warning/40"
                    : "border border-border bg-background text-muted-strong"
                }`}
              >
                🟡 Mantenimiento
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">
              En mantenimiento el bot responde únicamente con el mensaje
              configurado (sin flujos). Al volver a Activo retoma de inmediato.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Mensaje de mantenimiento</span>
              <span className="text-xs text-muted">
                Código CMS: {DEFAULT_CMS_MESSAGE_CODE}
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={1000}
                disabled={saving}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Mensaje que recibirán los usuarios en mantenimiento…"
              />
              <span className="text-xs text-muted">
                {message.length}/1000
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void load()}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Recargar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
