"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LaunchProgramListItem } from "@/lib/launch-programs/types";

export function LaunchProgramsListView() {
  const [items, setItems] = useState<LaunchProgramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/launch-programs", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: LaunchProgramListItem[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "No se pudieron cargar programas");
        setItems([]);
        return;
      }
      setItems(payload.data ?? []);
    } catch {
      setError("Error de conexión");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Programas de Lanzamiento"
        description="Administra Pioneros y futuros programas sin tocar código ni variables de entorno."
        actions={
          <Link
            href="/admin/parametros"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-strong hover:bg-surface-hover"
          >
            ← Parámetros
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-surface-elevated"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 block rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No hay programas. Aplica la migración 008_launch_programs.sql.
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.code}
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-brand/40 hover:bg-surface-hover"
              >
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted">{item.code}</p>
                  {item.description ? (
                    <p className="mt-2 text-sm text-muted-strong">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <StatusBadge
                  label={item.isActive ? "🟢 Activo" : "⚪ Inactivo"}
                  tone={item.isActive ? "success" : "neutral"}
                />
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
