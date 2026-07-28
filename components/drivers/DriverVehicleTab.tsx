"use client";

import type { DriverDetail } from "@/lib/drivers/types";
import type { DriverProfileEditableInput } from "@/lib/drivers/validation";
import {
  FichaEditableField,
  FichaField,
  fichaInputClass,
} from "@/components/drivers/FichaFields";

export function DriverVehicleTab({
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
          Datos del vehículo
        </h3>

        {editing ? (
          <>
            <FichaEditableField label="Placa" error={fieldErrors.plate}>
              <input
                type="text"
                value={form.plate}
                onChange={(e) =>
                  onChange({ plate: e.target.value.toUpperCase() })
                }
                className={fichaInputClass}
                autoCapitalize="characters"
              />
            </FichaEditableField>
            <FichaEditableField label="Marca" error={fieldErrors.vehicleBrand}>
              <input
                type="text"
                value={form.vehicleBrand}
                onChange={(e) => onChange({ vehicleBrand: e.target.value })}
                className={fichaInputClass}
              />
            </FichaEditableField>
            <FichaEditableField
              label="Modelo"
              error={fieldErrors.vehicleModel}
            >
              <input
                type="text"
                value={form.vehicleModel}
                onChange={(e) => onChange({ vehicleModel: e.target.value })}
                className={fichaInputClass}
              />
            </FichaEditableField>
            <FichaEditableField
              label="Color"
              error={fieldErrors.vehicleColor}
            >
              <input
                type="text"
                value={form.vehicleColor}
                onChange={(e) => onChange({ vehicleColor: e.target.value })}
                className={fichaInputClass}
              />
            </FichaEditableField>
            <FichaEditableField label="Año" error={fieldErrors.vehicleYear}>
              <input
                type="text"
                inputMode="numeric"
                value={form.vehicleYear}
                onChange={(e) => onChange({ vehicleYear: e.target.value })}
                className={fichaInputClass}
                placeholder="2020"
              />
            </FichaEditableField>
          </>
        ) : (
          <>
            <FichaField label="Placa" value={detail.plate} />
            <FichaField label="Marca" value={detail.vehicleBrand || "—"} />
            <FichaField label="Modelo" value={detail.vehicleModel || "—"} />
            <FichaField label="Color" value={detail.vehicleColor || "—"} />
            <FichaField
              label="Año"
              value={detail.vehicleYear ? String(detail.vehicleYear) : "—"}
            />
            <FichaField label="Resumen" value={detail.vehicleLabel || "—"} />
          </>
        )}
      </section>
    </div>
  );
}
