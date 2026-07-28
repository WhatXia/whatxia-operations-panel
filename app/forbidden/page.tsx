import Link from "next/link";
import { WhatXiaMark } from "@/components/brand/WhatXiaMark";

export default function ForbiddenPage() {
  return (
    <div className="wx-shell-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/95 p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <WhatXiaMark size="md" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Acceso denegado
        </h1>
        <p className="mt-2 text-sm text-muted">
          No tienes permisos para acceder a este recurso. El intento quedó
          registrado en auditoría.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-strong"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
