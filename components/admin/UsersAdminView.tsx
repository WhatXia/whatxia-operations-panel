"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import { ROLES, type AppRole } from "@/lib/auth/roles";

type UserRow = {
  id: string;
  email: string | null;
  role: AppRole | null;
  roleLabel: string;
  lastSignInAt: string | null;
  createdAt: string;
};

type RoleOption = {
  code: string;
  name: string;
  is_active: boolean;
};

export function UsersAdminView() {
  const secureFetch = useSecureFetch();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>(ROLES.OPS_ADMIN);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/roles", { cache: "no-store" }),
      ]);
      const usersPayload = await usersRes.json();
      const rolesPayload = await rolesRes.json();

      if (!usersRes.ok || !usersPayload.ok) {
        setError(usersPayload.error || "No se pudieron cargar usuarios");
        setUsers([]);
      } else {
        setUsers(usersPayload.data);
        setError(null);
      }

      if (rolesRes.ok && rolesPayload.ok) {
        const options = (rolesPayload.data as Array<{
          code: string;
          name: string;
          is_active: boolean;
        }>)
          .filter((item) => item.is_active)
          .map((item) => ({
            code: item.code,
            name: item.name,
            is_active: item.is_active,
          }));
        setRoles(options);
        if (options.length && !options.some((item) => item.code === role)) {
          setRole(options[0].code);
        }
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await secureFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear el usuario");
        return;
      }
      setEmail("");
      setPassword("");
      await load();
    } catch {
      setError("Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: AppRole) {
    const response = await secureFetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: nextRole }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cambiar el rol");
      return;
    }
    await load();
  }

  async function handleDelete(userId: string) {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    const response = await secureFetch(`/api/admin/users?userId=${userId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo eliminar");
      return;
    }
    await load();
  }

  const roleOptions =
    roles.length > 0
      ? roles
      : [
          { code: ROLES.OPS_ADMIN, name: "Administrador de Operaciones", is_active: true },
          { code: ROLES.SUPERADMIN, name: "Superadministrador", is_active: true },
        ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios y asignación de roles configurables."
      />

      <form
        onSubmit={handleCreate}
        className="mb-6 grid gap-3 rounded-xl border border-border bg-surface-elevated p-4 md:grid-cols-4"
      >
        <input
          type="email"
          required
          placeholder="correo@whatxia.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Contraseña (mín. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-70"
        >
          {saving ? "Creando..." : "Crear usuario"}
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
        {loading ? (
          <p className="p-4 text-sm text-muted">Cargando usuarios...</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border-subtle/80 last:border-0"
                >
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={user.roleLabel}
                      tone={user.role === "SUPERADMIN" ? "brand" : "info"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={user.role ?? ROLES.OPS_ADMIN}
                        onChange={(e) =>
                          void handleRoleChange(user.id, e.target.value)
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        {roleOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleDelete(user.id)}
                        className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
