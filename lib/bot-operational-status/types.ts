export const BOT_OPERATIONAL_STATUSES = ["ACTIVE", "MAINTENANCE"] as const;

export type BotOperationalStatusCode =
  (typeof BOT_OPERATIONAL_STATUSES)[number];

export const BOT_OPERATIONAL_STATUS_LABELS: Record<
  BotOperationalStatusCode,
  string
> = {
  ACTIVE: "Activo",
  MAINTENANCE: "Mantenimiento",
};

export const DEFAULT_CMS_MESSAGE_CODE = "SYS_BOT_MAINTENANCE";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "👋 Hola. En este momento estamos realizando una actualización programada. En unos minutos volveremos a estar disponibles. Gracias por tu comprensión.";

export type BotOperationalStatus = {
  status: BotOperationalStatusCode;
  maintenanceMessage: string;
  cmsMessageCode: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
  updatedById: string | null;
};

export function isBotOperationalStatus(
  value: unknown,
): value is BotOperationalStatusCode {
  return (
    typeof value === "string" &&
    (BOT_OPERATIONAL_STATUSES as readonly string[]).includes(value)
  );
}
