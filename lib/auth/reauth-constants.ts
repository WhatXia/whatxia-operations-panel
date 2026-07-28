export const REAUTH_HEADER = "x-whatxia-reauth";
export const REAUTH_TTL_MS = 2 * 60 * 1000;

export function isMutatingMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return (
    upper === "POST" ||
    upper === "PUT" ||
    upper === "PATCH" ||
    upper === "DELETE"
  );
}

export function isReauthExemptPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/reauthenticate" ||
    pathname.startsWith("/api/auth/reauthenticate")
  );
}
