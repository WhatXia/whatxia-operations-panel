import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { REAUTH_TTL_MS } from "@/lib/auth/reauth-constants";

export {
  REAUTH_HEADER,
  REAUTH_TTL_MS,
  isMutatingMethod,
  isReauthExemptPath,
} from "@/lib/auth/reauth-constants";

export type ReauthResult = "SUCCESS" | "FAILED";

type ReauthPayload = {
  uid: string;
  exp: number;
  nonce: string;
};

function reauthSecret(): string {
  return (
    process.env.REAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "whatxia-reauth-dev-secret"
  );
}

function signBody(body: string): string {
  return createHmac("sha256", reauthSecret()).update(body).digest("base64url");
}

export function issueReauthToken(userId: string, ttlMs = REAUTH_TTL_MS): string {
  const payload: ReauthPayload = {
    uid: userId,
    exp: Date.now() + ttlMs,
    nonce: randomBytes(12).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signBody(body);
  return `${body}.${sig}`;
}

export function verifyReauthToken(
  token: string | null | undefined,
  userId: string,
): { ok: true } | { ok: false; reason: string } {
  if (!token || !token.includes(".")) {
    return { ok: false, reason: "Token de reautenticación ausente" };
  }

  const [body, sig] = token.split(".");
  if (!body || !sig) {
    return { ok: false, reason: "Token de reautenticación inválido" };
  }

  const expected = signBody(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Firma de reautenticación inválida" };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ReauthPayload;

    if (payload.uid !== userId) {
      return { ok: false, reason: "Token no corresponde al usuario" };
    }
    if (!payload.exp || Date.now() > payload.exp) {
      return { ok: false, reason: "Token de reautenticación expirado" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Token de reautenticación corrupto" };
  }
}
