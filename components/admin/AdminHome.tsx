import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { adminNav } from "@/lib/nav";

export function AdminHome() {
  return (
    <div>
      <PageHeader
        title="Administración"
        description="Entorno exclusivo de Superadministrador: usuarios, roles, configuración y auditoría."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {adminNav
          .filter((item) => item.href !== "/admin")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-brand/30 hover:bg-surface-hover/50"
            >
              <h2 className="font-display text-sm font-semibold text-foreground">
                {item.label}
              </h2>
              <p className="mt-1 text-xs text-muted">{item.href}</p>
            </Link>
          ))}
      </div>
    </div>
  );
}
