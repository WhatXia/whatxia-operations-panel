"use client";

import { useEffect, useMemo, useState } from "react";
import { DriverConversationsTab } from "@/components/drivers/DriverConversationsTab";
import { DriverInfoTab } from "@/components/drivers/DriverInfoTab";
import { DriverReferralsTab } from "@/components/drivers/DriverReferralsTab";
import { DriverVehicleTab } from "@/components/drivers/DriverVehicleTab";
import { FichaField } from "@/components/drivers/FichaFields";
import { useReauth } from "@/components/security/ReauthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDetailDate } from "@/lib/drivers/format";
import { detailToDriverForm } from "@/lib/drivers/ficha-form";
import {
  postDriverProfileUpdate,
  runDriverProfileSaveGuards,
} from "@/lib/drivers/profile-save-guards";
import type {
  DriverDetail,
  DriverDetailResponse,
  DriverUpdateResponse,
} from "@/lib/drivers/types";
import {
  validateDriverProfileInput,
  type DriverProfileEditableInput,
} from "@/lib/drivers/validation";
import { createPasswordReauthGuard } from "@/lib/security/save-guards";

export const DRIVER_PROFILE_TABS = [
  { id: "informacion", label: "Información", emoji: "👤", editable: true },
  { id: "vehiculo", label: "Vehículo", emoji: "🚖", editable: true },
  { id: "documentos", label: "Documentos", emoji: "📄", editable: true },
  {
    id: "conversaciones",
    label: "Conversaciones",
    emoji: "💬",
    editable: false,
  },
  { id: "referidos", label: "Referidos", emoji: "🔗", editable: false },
  { id: "solicitudes", label: "Solicitudes", emoji: "📌", editable: false },
  { id: "auditoria", label: "Auditoría", emoji: "📝", editable: false },
] as const;

export type DriverProfileTabId = (typeof DRIVER_PROFILE_TABS)[number]["id"];

function TabPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
      <p className="font-display text-sm font-semibold text-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <p className="mt-3 text-xs text-muted">
        Estructura lista · lógica pendiente en próximos sprints
      </p>
    </div>
  );
}

function statusTone(detail: DriverDetail) {
  if (detail.adminStatus === "active") return "success" as const;
  if (detail.adminStatus === "suspended") return "warning" as const;
  return "danger" as const;
}

function DocumentosTab({
  detail,
  editing,
}: {
  detail: DriverDetail;
  editing: boolean;
}) {
  return (
    <div className="space-y-4">
      {editing ? (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
          La edición de documentos entrará en un sprint posterior. Los datos se
          muestran en solo lectura dentro del modo edición de la ficha.
        </p>
      ) : null}
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Vencimientos
        </h3>
        <FichaField
          label="SOAT"
          value={formatDetailDate(detail.soatExpiresAt)}
        />
        <FichaField
          label="Tecnomecánica"
          value={formatDetailDate(detail.technoExpiresAt)}
        />
        <FichaField
          label="Tarjeta de operación"
          value={formatDetailDate(detail.operationExpiresAt)}
        />
        <FichaField
          label="Licencia"
          value={formatDetailDate(detail.licenseExpiresAt)}
        />
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Bloqueo documental
        </h3>
        <FichaField
          label="Bloqueo docs"
          value={detail.documentsBlocked ? "Sí" : "No"}
        />
        <FichaField
          label="Motivo bloqueo"
          value={detail.documentsBlockedReason || "—"}
        />
        <FichaField
          label="Recordatorio enviado"
          value={formatDetailDate(detail.documentsReminderSentAt)}
        />
      </section>
    </div>
  );
}

export function DriverDetailDrawer({
  driverId,
  onClose,
}: {
  driverId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [tab, setTab] = useState<DriverProfileTabId>("informacion");

  /** Modo edición de TODA la ficha (no de una pestaña). */
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DriverProfileEditableInput | null>(null);
  const [baseline, setBaseline] = useState<DriverProfileEditableInput | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DriverProfileEditableInput, string>>
  >({});

  const { requestReauth } = useReauth();
  const passwordGuard = useMemo(
    () => createPasswordReauthGuard(requestReauth),
    [requestReauth],
  );

  useEffect(() => {
    if (!driverId) {
      setDetail(null);
      setLoadError(null);
      setTab("informacion");
      setEditing(false);
      setForm(null);
      setBaseline(null);
      setSaveError(null);
      setSaveSuccess(null);
      setFieldErrors({});
      return;
    }

    setTab("informacion");
    setEditing(false);
    setForm(null);
    setBaseline(null);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});

    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/drivers/${driverId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as DriverDetailResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setDetail(null);
          setLoadError(
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo cargar el detalle",
          );
          return;
        }
        setDetail(payload.data);
        const snapshot = detailToDriverForm(payload.data);
        setForm(snapshot);
        setBaseline(snapshot);
      } catch {
        if (!cancelled) {
          setDetail(null);
          setLoadError("Error de conexión");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const dirty = useMemo(() => {
    if (!form || !baseline) return false;
    return JSON.stringify(form) !== JSON.stringify(baseline);
  }, [form, baseline]);

  const open = Boolean(driverId);

  function startEdit() {
    if (!detail) return;
    const snapshot = detailToDriverForm(detail);
    setForm(snapshot);
    setBaseline(snapshot);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    if (baseline) setForm(baseline);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});
    setEditing(false);
  }

  function handleClose() {
    if (editing) {
      cancelEdit();
    }
    onClose();
  }

  function patchForm(patch: Partial<DriverProfileEditableInput>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  /**
   * Único punto de Guardar de la ficha.
   * Reauth vía createPasswordReauthGuard (reutilizable en todo el panel).
   */
  async function saveAllChanges() {
    if (!detail || !form) return;

    setSaveError(null);
    setSaveSuccess(null);
    const issues = validateDriverProfileInput(form);
    if (issues.length > 0) {
      const map: Partial<Record<keyof DriverProfileEditableInput, string>> = {};
      for (const issue of issues) {
        if (issue.field !== "form") map[issue.field] = issue.message;
      }
      setFieldErrors(map);
      setSaveError(issues[0]?.message ?? "Revisa los campos");
      const first = issues[0]?.field;
      if (
        first === "plate" ||
        first === "vehicleBrand" ||
        first === "vehicleModel" ||
        first === "vehicleColor" ||
        first === "vehicleYear"
      ) {
        setTab("vehiculo");
      } else if (first && first !== "form") {
        setTab("informacion");
      }
      return;
    }
    setFieldErrors({});

    const gate = await runDriverProfileSaveGuards(
      {
        driverId: detail.id,
        intendedChanges: { ...form },
      },
      [passwordGuard],
    );
    if (!gate.ok) {
      // Cancelar modal: no descartar formulario ni salir de edición.
      if (gate.code === "REAUTH_CANCELLED") {
        return;
      }
      setSaveError(gate.reason);
      return;
    }

    setSaving(true);
    try {
      const response = await postDriverProfileUpdate(
        detail.id,
        { ...form },
        { reauthToken: gate.reauthToken },
      );
      const payload = (await response.json()) as DriverUpdateResponse;
      if (!response.ok || !payload.ok) {
        setSaveError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo guardar",
        );
        return;
      }
      setDetail(payload.data);
      const snapshot = detailToDriverForm(payload.data);
      setForm(snapshot);
      setBaseline(snapshot);
      setEditing(false);
      setSaveSuccess("✅ Cambios guardados correctamente.");
    } catch {
      setSaveError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => {
          if (!editing) handleClose();
        }}
        aria-hidden={!open}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Ficha del conductor"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Ficha del conductor
              {editing ? " · Modo edición" : ""}
            </p>
            <h2 className="truncate font-display text-lg font-semibold text-foreground">
              {detail?.name ?? (loading ? "Cargando..." : "Conductor")}
            </h2>
            {detail ? (
              <p className="mt-0.5 truncate font-mono text-xs text-muted">
                {detail.documentId || "Sin documento"} · {detail.plate}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {!editing ? (
              <>
                <button
                  type="button"
                  disabled={!detail || loading}
                  onClick={startEdit}
                  className="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ✏️ Modificar
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-foreground"
                >
                  ❌ Cerrar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => void saveAllChanges()}
                  className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "✅ Guardar cambios"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEdit}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-strong hover:bg-surface-hover"
                >
                  ❌ Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className="flex gap-1 overflow-x-auto border-b border-border-subtle px-3 py-2"
          role="tablist"
          aria-label="Secciones de la ficha"
        >
          {DRIVER_PROFILE_TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted-strong hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <span className="mr-1" aria-hidden>
                  {item.emoji}
                </span>
                {item.label}
                {editing && !item.editable ? (
                  <span className="ml-1 text-[10px] font-medium text-muted">
                    (lectura)
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="wx-scrollbar flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-surface-hover/50"
                />
              ))}
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {loadError}
            </div>
          ) : null}

          {saveError ? (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {saveError}
            </div>
          ) : null}

          {saveSuccess ? (
            <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {saveSuccess}
            </div>
          ) : null}

          {detail && form && !loading ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={detail.statusLabel}
                  tone={statusTone(detail)}
                />
                <StatusBadge
                  label={detail.availabilityLabel}
                  tone={
                    detail.availability === "available" ? "brand" : "warning"
                  }
                />
                {detail.documentsBlocked ? (
                  <StatusBadge label="Docs bloqueados" tone="danger" />
                ) : null}
                {editing ? (
                  <StatusBadge label="Editando ficha" tone="info" />
                ) : null}
              </div>

              {tab === "informacion" ? (
                <DriverInfoTab
                  detail={detail}
                  editing={editing}
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={patchForm}
                />
              ) : null}
              {tab === "vehiculo" ? (
                <DriverVehicleTab
                  detail={detail}
                  editing={editing}
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={patchForm}
                />
              ) : null}
              {tab === "documentos" ? (
                <DocumentosTab detail={detail} editing={editing} />
              ) : null}
              {tab === "conversaciones" ? (
                <DriverConversationsTab driverId={detail.id} />
              ) : null}
              {tab === "referidos" ? (
                <DriverReferralsTab
                  driverId={detail.id}
                  driverName={detail.name}
                />
              ) : null}
              {tab === "solicitudes" ? (
                <TabPlaceholder
                  title="Solicitudes"
                  description="Solo lectura. Aquí se mostrarán las solicitudes / servicios del conductor."
                />
              ) : null}
              {tab === "auditoria" ? (
                <TabPlaceholder
                  title="Auditoría"
                  description="Solo lectura. Aquí se mostrará el historial de auditoría relacionado con este conductor."
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
