"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AuditLogRow } from "@/lib/audit/types";

export function AuditAdminView() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user) params.set("user", user);
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (result) params.set("result", result);
      if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      if (q) params.set("q", q);
      params.set("sort", sort);

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo cargar auditoría");
        setRows([]);
        return;
      }
      setRows(payload.data);
      setError(null);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [user, module, action, result, from, to, q, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    const response = await fetch(`/api/admin/audit/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.ok) {
      setSelected(payload.data);
    }
  }

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description="Consulta de solo lectura de la trazabilidad total del Operations Center."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
          >
            Actualizar
          </button>
        }
      />

      <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Usuario (email)"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          value={module}
          onChange={(e) => setModule(e.target.value)}
          placeholder="Módulo"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Acción"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <select
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        >
          <option value="">Resultado</option>
          <option value="OK">OK</option>
          <option value="ERROR">ERROR</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en mensaje / ruta / recurso"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs"
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
        </select>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
        {loading ? (
          <p className="p-4 text-sm text-muted">Cargando auditoría...</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted">Sin eventos para los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Ruta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border-subtle/80 last:border-0 hover:bg-surface-hover/50"
                    onClick={() => void openDetail(row.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Date(row.created_at).toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {row.user_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.role || "—"}</td>
                    <td className="px-4 py-3 text-xs">{row.module || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={row.result}
                        tone={row.result === "OK" ? "success" : "danger"}
                      />
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-muted">
                      {row.path || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Detalle de auditoría
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-2 py-1 text-xs"
              >
                Cerrar
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {Object.entries(selected).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2"
                >
                  <dt className="text-[11px] uppercase tracking-wide text-muted">
                    {key}
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-foreground">
                    {typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </>
      ) : null}
    </div>
  );
}
