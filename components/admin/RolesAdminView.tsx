"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import {
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_LABELS,
  PERMISSION_MODULES,
  emptyPermissionMap,
  type PermissionLevel,
  type PermissionModule,
} from "@/lib/auth/permission-catalog";

type RoleListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  is_superadmin: boolean;
  userCount: number;
  permissions: Record<PermissionModule, PermissionLevel>;
};

type RoleUser = {
  id: string;
  email: string | null;
  lastSignInAt: string | null;
  createdAt: string;
};

type CatalogUser = {
  id: string;
  email: string | null;
  role: string | null;
};

type Tab = "permissions" | "users" | "settings";

export function RolesAdminView() {
  const secureFetch = useSecureFetch();
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("permissions");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [allUsers, setAllUsers] = useState<CatalogUser[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [permissions, setPermissions] = useState(
    emptyPermissionMap("none"),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const selected = useMemo(
    () => roles.find((role) => role.id === selectedId) ?? null,
    [roles, selectedId],
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudieron cargar roles");
        setRoles([]);
        return;
      }
      setRoles(payload.data);
      setError(null);
      setSelectedId((current) => current ?? payload.data[0]?.id ?? null);
    } catch {
      setError("Error de conexión al cargar roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoleDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/roles/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cargar el rol");
      return;
    }
    const role = payload.data as RoleListItem & { users: RoleUser[] };
    setName(role.name);
    setDescription(role.description ?? "");
    setIsActive(role.is_active);
    setPermissions(role.permissions);
    setUsers(role.users ?? []);
    setRoles((prev) =>
      prev.map((item) =>
        item.id === role.id
          ? {
              ...item,
              ...role,
              userCount: role.users?.length ?? item.userCount,
            }
          : item,
      ),
    );
  }, []);

  const loadAllUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && payload.ok) {
      setAllUsers(payload.data);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
    void loadAllUsers();
  }, [loadRoles, loadAllUsers]);

  useEffect(() => {
    if (selectedId) {
      void loadRoleDetail(selectedId);
    }
  }, [selectedId, loadRoleDetail]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await secureFetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear el rol");
        return;
      }
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      await loadRoles();
      setSelectedId(payload.data.id);
    } catch {
      setError("Error al crear rol");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/roles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          is_active: isActive,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo guardar");
        return;
      }
      await loadRoles();
      await loadRoleDetail(selected.id);
    } catch {
      setError("Error al guardar rol");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePermissions() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/roles/${selected.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudieron guardar permisos");
        return;
      }
      await loadRoleDetail(selected.id);
    } catch {
      setError("Error al guardar permisos");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/roles/${selected.id}/duplicate`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo duplicar");
        return;
      }
      await loadRoles();
      setSelectedId(payload.data.id);
    } catch {
      setError("Error al duplicar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el rol ${selected.name}?`)) return;
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/roles/${selected.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar");
        return;
      }
      setSelectedId(null);
      await loadRoles();
    } catch {
      setError("Error al eliminar");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignUser(event: FormEvent) {
    event.preventDefault();
    if (!selected || !assignUserId) return;
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/roles/${selected.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUserId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo asignar");
        return;
      }
      setAssignUserId("");
      await loadRoleDetail(selected.id);
      await loadAllUsers();
    } catch {
      setError("Error al asignar usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!selected) return;
    if (!window.confirm("¿Quitar este usuario del rol?")) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/roles/${selected.id}/users?userId=${userId}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo quitar");
        return;
      }
      await loadRoleDetail(selected.id);
      await loadAllUsers();
    } catch {
      setError("Error al quitar usuario");
    } finally {
      setSaving(false);
    }
  }

  const assignableUsers = allUsers.filter(
    (user) => !users.some((assigned) => assigned.id === user.id),
  );

  return (
    <div>
      <PageHeader
        title="Administrador de Roles"
        description="Roles configurables, matriz de permisos y asignación de usuarios."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
          >
            Crear rol
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {createOpen ? (
        <form
          onSubmit={handleCreate}
          className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-elevated p-4 md:grid-cols-3"
        >
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del rol"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descripción"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-70"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-surface-elevated">
          {loading ? (
            <p className="p-4 text-sm text-muted">Cargando...</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {roles.map((role) => {
                const active = role.id === selectedId;
                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(role.id)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                        active
                          ? "bg-brand-soft"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {role.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted">
                        {role.code}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge
                          label={`${role.userCount} usuarios`}
                          tone="info"
                        />
                        {!role.is_active ? (
                          <StatusBadge label="Inactivo" tone="danger" />
                        ) : null}
                        {role.is_superadmin ? (
                          <StatusBadge label="Superadmin" tone="brand" />
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          {!selected ? (
            <p className="text-sm text-muted">Selecciona un rol.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.description || "Sin descripción"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDuplicate()}
                    disabled={saving}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={
                      saving || selected.is_superadmin || selected.is_system
                    }
                    className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-40"
                    title={
                      selected.is_superadmin || selected.is_system
                        ? "Roles de sistema no eliminables"
                        : "Eliminar rol"
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="mb-4 flex gap-2 border-b border-border-subtle pb-2">
                {(
                  [
                    ["permissions", "Permisos"],
                    ["users", `Usuarios (${users.length})`],
                    ["settings", "Configuración"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      tab === key
                        ? "bg-brand-soft text-brand"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "permissions" ? (
                <div>
                  {selected.is_superadmin ? (
                    <p className="mb-3 text-sm text-muted">
                      El Superadministrador siempre tiene acceso total. La
                      matriz se mantiene en Administrar.
                    </p>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted">
                        <tr className="border-b border-border-subtle">
                          <th className="px-2 py-2">Módulo</th>
                          <th className="px-2 py-2">Permiso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_MODULES.map((module) => (
                          <tr
                            key={module.key}
                            className="border-b border-border-subtle/70"
                          >
                            <td className="px-2 py-2 text-foreground">
                              {module.label}
                            </td>
                            <td className="px-2 py-2">
                              <select
                                disabled={selected.is_superadmin || saving}
                                value={permissions[module.key]}
                                onChange={(e) =>
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [module.key]: e.target
                                      .value as PermissionLevel,
                                  }))
                                }
                                className="w-full max-w-xs rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                              >
                                {PERMISSION_LEVELS.map((level) => (
                                  <option key={level} value={level}>
                                    {PERMISSION_LEVEL_LABELS[level]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    disabled={selected.is_superadmin || saving}
                    onClick={() => void handleSavePermissions()}
                    className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50"
                  >
                    Guardar permisos
                  </button>
                </div>
              ) : null}

              {tab === "users" ? (
                <div>
                  <form
                    onSubmit={handleAssignUser}
                    className="mb-4 flex flex-wrap gap-2"
                  >
                    <select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email} {user.role ? `(${user.role})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!assignUserId || saving}
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50"
                    >
                      Asignar
                    </button>
                  </form>

                  {users.length === 0 ? (
                    <p className="text-sm text-muted">
                      No hay usuarios asignados a este rol.
                    </p>
                  ) : (
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted">
                        <tr className="border-b border-border-subtle">
                          <th className="px-2 py-2">Correo</th>
                          <th className="px-2 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-border-subtle/70"
                          >
                            <td className="px-2 py-2">{user.email}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => void handleRemoveUser(user.id)}
                                className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}

              {tab === "settings" ? (
                <div className="max-w-lg space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted">
                      Nombre
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted">
                      Descripción
                    </span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={selected.is_superadmin}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Rol activo
                  </label>
                  <p className="text-xs text-muted">
                    Código: <span className="font-mono">{selected.code}</span>
                    {selected.is_system ? " · Sistema" : ""}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveSettings()}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-70"
                  >
                    Guardar cambios
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
