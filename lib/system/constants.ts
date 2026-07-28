import packageJson from "@/package.json";

export const OPS_VERSION = packageJson.version ?? "0.1.0";

/** Versión reportada del bot (mismo major del MVP salvo override por env). */
export const BOT_VERSION =
  process.env.NEXT_PUBLIC_BOT_VERSION?.trim() || "0.1.0";
