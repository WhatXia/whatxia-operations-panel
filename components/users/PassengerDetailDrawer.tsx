"use client";

import { useCallback, useEffect, useState } from "react";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import type {
  PassengerDetailResponse,
  PassengerStatusUpdateResponse,
} from "@/lib/passengers/api-types";
import {
  formatPassengerInteractionLabel,
  formatPassengerRegisteredLabel,
  formatPassengerPhone,
  PASSENGER_STATUS_BADGE_CLASS,
  PASSENGER_STATUS_EMOJI,
} from "@/lib/passengers/format";
import {
  availableActionsForStatus,
  STATUS_ACTION_LABELS,
} from "@/lib/passengers/status";
import type {
  PassengerDetail,
  PassengerStatusAction,
} from "@/lib/passengers/types";

export function PassengerDetailDrawer({
  passengerId,
  canMutate,
  onClose,
  onStatusChanged,
}: {
  passengerId: string | null;
  canMutate: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}) {
  const secureFetch = useSecureFetch();
  const [detail, setDetail] = useState<PassengerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<PassengerStatusAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch(`/api/passengers/${id}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as PassengerDetailResponse;
      if (!response.ok || !payload.ok) {
        setDetail(null);
        setError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cargar el usuario",
        );
        return;
      }
      setDetail(payload.data);
    } catch {
      setDetail(null);
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!passengerId) {
      setDetail(null);
      setError(null);
      return;
    }
    void load(passengerId);
  }, [passengerId, load]);

  useEffect(() => {
    if (!passengerId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [passengerId, onClose]);

  async function runAction(action: PassengerStatusAction) {
    if (!passengerId || !canMutate) return;
    setActing(action);
    setActionError(null);
    try {
      const response = await secureFetch(`/api/passengers/${passengerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as PassengerStatusUpdateResponse;
      if (!response.ok || !payload.ok) {
        setActionError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cambiar el estado",
        );
        return;
      }
      setDetail(payload.data);
      onStatusChanged();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error al cambiar estado",
      );
    } finally {
      setActing(null);
    }
  }

  if (!passengerId) return null;

  const actions = detail ? availableActionsForStatus(detail.status) : [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de usuario"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Usuario final
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">
              {detail?.name ?? (loading ? "Cargando…" : "Usuario")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
          >
            Cerrar
          </button>
        </header>

        <div className="wx-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-surface-hover/50"
                />
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
              <p className="text-sm text-danger">{error}</p>
              <button
                type="button"
                onClick={() => void load(passengerId)}
                className="mt-3 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold"
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {detail && !loading ? (
            <div className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Información personal
                </h3>
                <Field label="Nombre" value={detail.name} />
                <Field
                  label="Nombre completo"
                  value={detail.fullName || "—"}
                />
                <Field
                  label="Preferido"
                  value={detail.preferredName || "—"}
                />
                <Field
                  label="WhatsApp"
                  value={detail.whatsappName || "—"}
                />
                <Field
                  label="Teléfono"
                  value={formatPassengerPhone(detail.phone)}
                  mono
                />
                <Field
                  label="Origen registro"
                  value={detail.registrationSource || "—"}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Estado
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${PASSENGER_STATUS_BADGE_CLASS[detail.status]}`}
                >
                  <span aria-hidden>
                    {PASSENGER_STATUS_EMOJI[detail.status]}
                  </span>
                  {detail.status}
                </span>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Actividad
                </h3>
                <Field
                  label="Fecha de registro"
                  value={formatPassengerRegisteredLabel(detail.registeredAt)}
                />
                <Field
                  label="Última conversación"
                  value={formatPassengerInteractionLabel(
                    detail.lastInteractionAt,
                  )}
                />
                <Field
                  label="Último servicio"
                  value={
                    detail.lastTrip
                      ? `${detail.lastTrip.status} · ${detail.lastTrip.originText || "—"} → ${detail.lastTrip.destinationText || "—"} · ${formatPassengerRegisteredLabel(detail.lastTrip.createdAt)}`
                      : "Sin servicios"
                  }
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Acciones
                </h3>
                {!canMutate ? (
                  <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-muted">
                    Solo lectura. Se requiere permiso de edición en Usuarios
                    finales para cambiar estados.
                  </p>
                ) : actions.length === 0 ? (
                  <p className="text-xs text-muted">
                    No hay acciones disponibles para este estado.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={acting !== null}
                        onClick={() => void runAction(action)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          action === "block"
                            ? "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
                            : "bg-brand text-brand-ink hover:bg-brand-hover"
                        }`}
                      >
                        {acting === action
                          ? "Aplicando…"
                          : STATUS_ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>
                )}
                {actionError ? (
                  <p className="text-xs text-danger">{actionError}</p>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 rounded-lg border border-border-subtle bg-surface-elevated/60 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Badge compacto reutilizable en tabla */
export function PassengerStatusBadge({
  status,
}: {
  status: PassengerDetail["status"];
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${PASSENGER_STATUS_BADGE_CLASS[status]}`}
    >
      <span aria-hidden>{PASSENGER_STATUS_EMOJI[status]}</span>
      {status}
    </span>
  );
}

export function PassengerQuickActions({
  status,
  canMutate,
  busy,
  onAction,
}: {
  status: PassengerDetail["status"];
  canMutate: boolean;
  busy: boolean;
  onAction: (action: PassengerStatusAction) => void;
}) {
  const actions = availableActionsForStatus(status);
  if (!canMutate || actions.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onAction(action);
          }}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
            action === "block"
              ? "border-danger/35 text-danger hover:bg-danger/10"
              : "border-border text-muted-strong hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          {STATUS_ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  );
}
