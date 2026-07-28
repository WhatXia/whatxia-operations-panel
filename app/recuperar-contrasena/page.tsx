import Link from "next/link";
import { WhatXiaMark } from "@/components/brand/WhatXiaMark";

export default function RecuperarContrasenaPage() {
  return (
    <div className="wx-shell-bg relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-brand/10 to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <WhatXiaMark size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm text-muted">
            Este flujo quedará disponible en el siguiente sprint. Por ahora,
            contacta a un administrador de WhatXia para restablecer el acceso.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover"
          >
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
