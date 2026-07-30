import { formatDateTimeLabel } from "@/lib/dashboard/time";

const WHATXIA_OFFICIAL_WHATSAPP_E164 = "573193455555";

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

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase();
}

function whatsappBusinessPhoneE164(): string {
  const raw =
    process.env.WHATSAPP_BUSINESS_PHONE?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() ||
    "";
  const digits = raw.replace(/[^\d]/g, "");
  return digits || WHATXIA_OFFICIAL_WHATSAPP_E164;
}

/**
 * Enlace canónico REF-005 (mismo del bot):
 * https://wa.me/573193455555?text=REF%20DRV-XXXXX
 */
export function buildReferralInviteUrl(code: string): string {
  const normalized = normalizeReferralCode(code);
  const text = encodeURIComponent(`REF ${normalized}`);
  return `https://wa.me/${whatsappBusinessPhoneE164()}?text=${text}`;
}

/** @deprecated Prefer buildReferralInviteUrl — el enlace ya no es una URL web con ?ref= */
export function resolveInviteUrl(
  storedUrl: string | null | undefined,
  code: string,
): string {
  const url = storedUrl?.trim();
  if (url) return url;
  return buildReferralInviteUrl(code);
}
