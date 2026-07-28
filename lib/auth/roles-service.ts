import {
  PERMISSION_MODULES,
  emptyPermissionMap,
  isPermissionLevel,
  normalizePermissionMap,
  type PermissionLevel,
  type PermissionMap,
  type PermissionModule,
} from "@/lib/auth/permission-catalog";
import { ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppRoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
};

export type AppRolePermissionRow = {
  id: string;
  role_id: string;
  module: string;
  level: PermissionLevel;
};

export type RoleWithMeta = AppRoleRow & {
  permissions: Record<PermissionModule, PermissionLevel>;
  userCount: number;
};

function slugCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base.length >= 2 ? base : `ROLE_${Date.now().toString(36).toUpperCase()}`;
}

async function uniqueRoleCode(preferred: string): Promise<string> {
  const supabase = createAdminClient();
  let code = preferred;
  let attempt = 0;
  while (attempt < 20) {
    const { data } = await supabase
      .from("app_roles")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
    attempt += 1;
    code = `${preferred}_${attempt}`.slice(0, 64);
  }
  return `ROLE_${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function listRoles(): Promise<AppRoleRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("*")
    .order("is_superadmin", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AppRoleRow[];
}

export async function getRoleById(id: string): Promise<AppRoleRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AppRoleRow | null) ?? null;
}

export async function getRoleByCode(code: string): Promise<AppRoleRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AppRoleRow | null) ?? null;
}

export async function getRolePermissions(
  roleId: string,
): Promise<Record<PermissionModule, PermissionLevel>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_role_permissions")
    .select("module, level")
    .eq("role_id", roleId);
  if (error) throw new Error(error.message);

  const map = emptyPermissionMap("none");
  for (const row of data ?? []) {
    const module = row.module as PermissionModule;
    if (PERMISSION_MODULES.some((item) => item.key === module) && isPermissionLevel(row.level)) {
      map[module] = row.level;
    }
  }
  return map;
}

export async function countUsersWithRoleCode(code: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);
  return (data.users ?? []).filter((user) => {
    const role = user.app_metadata?.role;
    return typeof role === "string" && role === code;
  }).length;
}

export async function listUsersWithRoleCode(code: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);
  return (data.users ?? [])
    .filter((user) => user.app_metadata?.role === code)
    .map((user) => ({
      id: user.id,
      email: user.email ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
    }));
}

export async function listRolesWithMeta(): Promise<RoleWithMeta[]> {
  const roles = await listRoles();
  const result: RoleWithMeta[] = [];
  for (const role of roles) {
    const [permissions, userCount] = await Promise.all([
      getRolePermissions(role.id),
      countUsersWithRoleCode(role.code),
    ]);
    result.push({ ...role, permissions, userCount });
  }
  return result;
}

export async function createRole(input: {
  name: string;
  description?: string | null;
  code?: string | null;
  permissions?: PermissionMap | null;
}): Promise<RoleWithMeta> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre del rol es obligatorio");

  const preferred = input.code?.trim().toUpperCase() || slugCode(name);
  const code = await uniqueRoleCode(preferred);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("app_roles")
    .insert({
      code,
      name,
      description: input.description?.trim() || null,
      is_active: true,
      is_system: false,
      is_superadmin: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el rol");
  }

  const role = data as AppRoleRow;
  const permissions = normalizePermissionMap(input.permissions);
  await replaceRolePermissions(role.id, permissions);

  return {
    ...role,
    permissions,
    userCount: 0,
  };
}

export async function updateRole(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  },
): Promise<AppRoleRow> {
  const current = await getRoleById(id);
  if (!current) throw new Error("Rol no encontrado");

  if (current.is_superadmin && input.is_active === false) {
    throw new Error("El rol Superadministrador no puede desactivarse");
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof input.name === "string" && input.name.trim()) {
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (typeof input.is_active === "boolean") {
    patch.is_active = input.is_active;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_roles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar el rol");
  }

  if (patch.is_active === false || patch.name || patch.description !== undefined) {
    await syncUsersMetadataForRoleCode(current.code);
  }

  return data as AppRoleRow;
}

export async function replaceRolePermissions(
  roleId: string,
  permissions: Record<PermissionModule, PermissionLevel>,
): Promise<void> {
  const role = await getRoleById(roleId);
  if (!role) throw new Error("Rol no encontrado");

  // Superadmin siempre conserva admin total.
  const finalMap = role.is_superadmin
    ? emptyPermissionMap("admin")
    : normalizePermissionMap(permissions);

  const supabase = createAdminClient();
  const rows = PERMISSION_MODULES.map((module) => ({
    role_id: roleId,
    module: module.key,
    level: finalMap[module.key],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("app_role_permissions")
    .upsert(rows, { onConflict: "role_id,module" });

  if (error) throw new Error(error.message);

  await syncUsersMetadataForRoleCode(role.code);
}

export async function duplicateRole(id: string): Promise<RoleWithMeta> {
  const role = await getRoleById(id);
  if (!role) throw new Error("Rol no encontrado");
  const permissions = await getRolePermissions(id);

  return createRole({
    name: `${role.name} (copia)`,
    description: role.description,
    code: `${role.code}_COPY`,
    permissions: role.is_superadmin
      ? emptyPermissionMap("admin")
      : permissions,
  });
}

export async function deleteRole(id: string): Promise<void> {
  const role = await getRoleById(id);
  if (!role) throw new Error("Rol no encontrado");
  if (role.is_superadmin || role.code === ROLES.SUPERADMIN) {
    throw new Error("El rol Superadministrador no puede eliminarse");
  }
  if (role.is_system) {
    throw new Error("Los roles de sistema no pueden eliminarse");
  }

  const users = await countUsersWithRoleCode(role.code);
  if (users > 0) {
    throw new Error(
      `No se puede eliminar: hay ${users} usuario(s) asignado(s) a este rol`,
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countSuperAdminUsers(): Promise<number> {
  const supabase = createAdminClient();
  const roles = await listRoles();
  const superCodes = new Set(
    roles.filter((role) => role.is_superadmin && role.is_active).map((r) => r.code),
  );
  if (superCodes.size === 0) {
    superCodes.add(ROLES.SUPERADMIN);
  }

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  return (data.users ?? []).filter((user) => {
    const code = user.app_metadata?.role;
    return typeof code === "string" && superCodes.has(code);
  }).length;
}

export async function assignUserToRole(input: {
  userId: string;
  roleId: string;
}): Promise<void> {
  const role = await getRoleById(input.roleId);
  if (!role) throw new Error("Rol no encontrado");
  if (!role.is_active) throw new Error("El rol está desactivado");

  const supabase = createAdminClient();
  const { data: current, error: getError } =
    await supabase.auth.admin.getUserById(input.userId);
  if (getError || !current.user) {
    throw new Error(getError?.message || "Usuario no encontrado");
  }

  const previousCode =
    typeof current.user.app_metadata?.role === "string"
      ? current.user.app_metadata.role
      : null;

  // Evitar dejar el sistema sin Superadministrador.
  if (previousCode) {
    const previousRole = await getRoleByCode(previousCode);
    if (previousRole?.is_superadmin && !role.is_superadmin) {
      const count = await countSuperAdminUsers();
      if (count <= 1) {
        throw new Error(
          "Debe existir al menos un Superadministrador en el sistema",
        );
      }
    }
  }

  const permissions = await getRolePermissions(role.id);
  const { error } = await supabase.auth.admin.updateUserById(input.userId, {
    app_metadata: {
      ...(current.user.app_metadata ?? {}),
      role: role.code,
      role_id: role.id,
      role_name: role.name,
      is_superadmin: role.is_superadmin,
      permissions,
    },
  });

  if (error) throw new Error(error.message);
}

export async function removeUserFromRole(input: {
  userId: string;
  roleId: string;
}): Promise<void> {
  const role = await getRoleById(input.roleId);
  if (!role) throw new Error("Rol no encontrado");

  const supabase = createAdminClient();
  const { data: current, error: getError } =
    await supabase.auth.admin.getUserById(input.userId);
  if (getError || !current.user) {
    throw new Error(getError?.message || "Usuario no encontrado");
  }

  if (current.user.app_metadata?.role !== role.code) {
    throw new Error("El usuario no pertenece a este rol");
  }

  if (role.is_superadmin) {
    const count = await countSuperAdminUsers();
    if (count <= 1) {
      throw new Error(
        "Debe existir al menos un Superadministrador en el sistema",
      );
    }
  }

  // Al quitar del rol, asignar OPS_ADMIN activo por defecto.
  const fallback =
    (await getRoleByCode(ROLES.OPS_ADMIN)) ??
    (await listRoles()).find((item) => !item.is_superadmin && item.is_active);

  if (!fallback) {
    throw new Error("No hay un rol de respaldo disponible");
  }

  await assignUserToRole({ userId: input.userId, roleId: fallback.id });
}

export async function syncUserMetadataFromRoleCode(
  userId: string,
  roleCode: string,
): Promise<void> {
  const role = await getRoleByCode(roleCode);
  if (!role) return;

  const permissions = await getRolePermissions(role.id);
  const supabase = createAdminClient();
  const { data: current } = await supabase.auth.admin.getUserById(userId);
  if (!current.user) return;

  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(current.user.app_metadata ?? {}),
      role: role.code,
      role_id: role.id,
      role_name: role.name,
      is_superadmin: role.is_superadmin,
      permissions,
    },
  });
}

export async function syncUsersMetadataForRoleCode(roleCode: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  const users = (data.users ?? []).filter(
    (user) => user.app_metadata?.role === roleCode,
  );

  for (const user of users) {
    await syncUserMetadataFromRoleCode(user.id, roleCode);
  }
}
