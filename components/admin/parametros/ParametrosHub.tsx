"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const SECTIONS = [
  {
    href: "/admin/parametros/programas-lanzamiento",
    title: "Programas de Lanzamiento",
    description:
      "Pioneros y futuros programas (Embajadores, Beta cerrada, etc.).",
  },
];

export function ParametrosHub() {
  return (
    <div>
      <PageHeader
        title="Parámetros"
        description="Parámetros globales del sistema administrables desde el Operations Center."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((item) => (
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
