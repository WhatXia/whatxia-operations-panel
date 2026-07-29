import type { PermissionModule } from "@/lib/auth/permission-catalog";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "services"
    | "drivers"
    | "users"
    | "incidents"
    | "metrics"
    | "system"
    | "conversations";
  module: PermissionModule;
};

/** Operación — menú OPS-USER-001 */
export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", module: "dashboard" },
  { href: "/servicios", label: "Servicios", icon: "services", module: "services" },
  { href: "/conductores", label: "Conductores", icon: "drivers", module: "drivers" },
  { href: "/usuarios", label: "Usuarios", icon: "users", module: "passengers" },
  { href: "/incidentes", label: "Incidencias", icon: "incidents", module: "incidents" },
  {
    href: "/conversaciones",
    label: "Conversaciones",
    icon: "conversations",
    module: "conversations",
  },
  { href: "/metricas", label: "Métricas", icon: "metrics", module: "metrics" },
  {
    href: "/estado-sistema",
    label: "Estado del Sistema",
    icon: "system",
    module: "system_status",
  },
];

export type AdminNavItem = {
  href: string;
  label: string;
  module: PermissionModule;
};

/** Administración — usuarios del panel renombrados a Usuarios Admin */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Resumen", module: "configuration" },
  { href: "/admin/usuarios", label: "Usuarios Admin", module: "users" },
  { href: "/admin/roles", label: "Roles", module: "roles" },
  { href: "/admin/auditoria", label: "Auditoría", module: "audit" },
  { href: "/admin/configuracion", label: "Configuración", module: "configuration" },
  { href: "/admin/bot", label: "Bot Manager", module: "configuration" },
  { href: "/admin/ia", label: "IA", module: "ai" },
  { href: "/admin/integraciones", label: "Integraciones", module: "integrations" },
  { href: "/admin/parametros", label: "Parámetros", module: "configuration" },
];
