import { PageHeader } from "@/components/ui/PageHeader";

export function AdminStubPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <p className="text-sm text-muted-strong">
          Módulo reservado para Superadministrador. La configuración detallada
          se implementará en sprints posteriores. El acceso y los intentos ya
          quedan auditados.
        </p>
      </div>
    </div>
  );
}
