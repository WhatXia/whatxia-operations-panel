"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WhatXiaMark } from "@/components/brand/WhatXiaMark";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(
          payload.error ||
            "No se pudo iniciar sesión. Verifica correo y contraseña.",
        );
        setLoading(false);
        return;
      }

      const next = searchParams.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Error de configuración o de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="wx-shell-bg relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-brand/10 to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <WhatXiaMark size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Ingresar al Operations Center
            </h1>
            <p className="mt-2 text-sm text-muted">
              Acceso exclusivo para usuarios autorizados de WhatXia.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Correo
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <div className="flex justify-end">
              <Link
                href="/recuperar-contrasena"
                className="text-xs font-medium text-brand transition hover:text-brand-hover"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Ingresando..." : "Entrar al panel"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Autenticación con Supabase Auth · Roles y auditoría activos
          </p>
        </div>
      </div>
    </div>
  );
}
