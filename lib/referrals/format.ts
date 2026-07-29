import { formatDateTimeLabel } from "@/lib/dashboard/time";

export function referralStatusLabel(status: string): string {
  switch (status) {
    case "PIONEER":
      return "Pionero";
    case "BETA":
      return "Beta";
    case "ACTIVE":
      return "Activo";
    case "BLOCKED":
      return "Bloqueado";
    case "INVITED":
      return "Invitado";
    default:
      return status || "—";
  }
}

export function formatReferralDate(iso: string | null | undefined): string {
  return formatDateTimeLabel(iso);
}

export function resolveInviteUrl(
  storedUrl: string | null | undefined,
  code: string,
): string {
  const url = storedUrl?.trim();
  if (url) return url;
  const base =
    process.env.NEXT_PUBLIC_REFERRAL_INVITE_BASE_URL?.trim() ||
    process.env.REFERRAL_INVITE_BASE_URL?.trim() ||
    "";
  if (!base) return `whatxia://invite/${code}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}ref=${encodeURIComponent(code)}`;
}
