"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const ITEMS = [
  {
    href: "/admin/parametros/sistema/estado-bot",
    title: "Estado del Bot",
    description:
      "Activo / Mantenimiento y mensaje SYS_BOT_MAINTENANCE (SYS-001).",
  },
];

export function SistemaHub() {
  return (
    <div>
      <PageHeader
        title="Sistema"
        description="Parámetros operativos globales del bot y la plataforma."
        actions={
          <Link
            href="/admin/parametros"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            ← Parámetros
          </Link>
        }
      />
      <p className="mb-4 text-xs text-muted">Parámetros / Sistema</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-brand/40 hover:bg-surface-hover"
          >
            <h2 className="font-display text-sm font-semibold text-foreground">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
