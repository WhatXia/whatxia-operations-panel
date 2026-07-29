import { PageHeader } from "@/components/ui/PageHeader";

export default function IncidentesPage() {
  return (
    <div>
      <PageHeader
        title="Incidencias"
        description="Centro de incidencias operativas. Estructura de menú lista; lógica en sprints posteriores."
      />
      <div className="rounded-xl border border-dashed border-border bg-surface-elevated px-5 py-10 text-center">
        <p className="font-display text-sm font-semibold text-foreground">
          Módulo en preparación
        </p>
        <p className="mt-2 text-sm text-muted">
          Esta ruta existe para completar la reorganización del menú OPS-USER-001.
          El flujo funcional de incidencias se implementará en un sprint dedicado.
        </p>
      </div>
    </div>
  );
}
