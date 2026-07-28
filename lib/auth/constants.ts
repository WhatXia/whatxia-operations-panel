import { isAdminPath, isOpsPath } from "@/lib/auth/permissions";

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/servicios",
  "/conductores",
  "/metricas",
  "/estado-sistema",
  "/conversaciones",
  "/admin",
] as const;

export function isProtectedPath(pathname: string) {
  return isOpsPath(pathname) || isAdminPath(pathname);
}
