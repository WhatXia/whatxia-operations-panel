"use client";

import { adminStatusLabel } from "@/lib/drivers/format";
import type { DriverDetail } from "@/lib/drivers/types";
import {
  DRIVER_ADMIN_STATUSES,
  type DriverAdminStatus,
  type DriverProfileEditableInput,
} from "@/lib/drivers/validation";
import {
  FichaEditableField,
  FichaField,
  fichaInputClass,
} from "@/components/drivers/FichaFields";

export function DriverInfoTab({
  detail,
  editing,
  form,
  fieldErrors,
  onChange,
}: {
  detail: DriverDetail;
  editing: boolean;
  form: DriverProfileEditableInput;
  fieldErrors: Partial<Record<keyof DriverProfileEditableInput, string>>;
  onChange: (patch: Partial<DriverProfileEditableInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Campos protegidos
        </h3>
        <FichaField label="ID interno" value={detail.id} />
        <FichaField
          label="Documento de identidad"
          value={detail.documentId || "—"}
        />
        <FichaField
          label="Nombre completo"
          value={detail.fullName || detail.name || "—"}
        />
        <FichaField label="Fecha de registro" value={detail.createdAtLabel} />
      </section>

      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Datos editables
        </h3>

        {editing ? (
          <>
            <FichaEditableField
              label="Correo electrónico"
              error={fieldErrors.email}
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className={fichaInputClass}
                autoComplete="email"
              />
            </FichaEditableField>
            <FichaEditableField label="Dirección" error={fieldErrors.address}>
              <input
                type="text"
                value={form.address}
                onChange={(e) => onChange({ address: e.target.value })}
                className={fichaInputClass}
              />
            </FichaEditableField>
            <FichaEditableField label="Ciudad" error={fieldErrors.city}>
              <input
                type="text"
                value={form.city}
                onChange={(e) => onChange({ city: e.target.value })}
                className={fichaInputClass}
              />
            </FichaEditableField>
            <FichaEditableField
              label="Número de WhatsApp"
              error={fieldErrors.phone}
            >
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                className={fichaInputClass}
                placeholder="573001234567"
              />
            </FichaEditableField>
            <FichaEditableField
              label="Estado del conductor"
              error={fieldErrors.adminStatus}
            >
              <select
                value={form.adminStatus}
                onChange={(e) =>
                  onChange({
                    adminStatus: e.target.value as DriverAdminStatus,
                  })
                }
                className={fichaInputClass}
              >
                {DRIVER_ADMIN_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FichaEditableField>
            <FichaEditableField
              label="Observaciones internas"
              error={fieldErrors.internalNotes}
            >
              <textarea
                value={form.internalNotes}
                onChange={(e) => onChange({ internalNotes: e.target.value })}
                rows={4}
                className={fichaInputClass}
                placeholder="Notas solo visibles en el Panel de Operaciones"
              />
            </FichaEditableField>
          </>
        ) : (
          <>
            <FichaField label="Correo electrónico" value={detail.email || "—"} />
            <FichaField label="Dirección" value={detail.address || "—"} />
            <FichaField label="Ciudad" value={detail.city || "—"} />
            <FichaField label="Número de WhatsApp" value={detail.phone || "—"} />
            <FichaField
              label="Estado del conductor"
              value={adminStatusLabel(detail.adminStatus)}
            />
            <FichaField
              label="Observaciones internas"
              value={detail.internalNotes?.trim() || "—"}
            />
            <FichaField
              label="Disponibilidad operativa"
              value={detail.availabilityLabel}
            />
            <FichaField
              label="Última actividad"
              value={detail.lastActivityLabel}
            />
            <FichaField label="Saldo" value={detail.balanceLabel} />
          </>
        )}
      </section>
    </div>
  );
}
