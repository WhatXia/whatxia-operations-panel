import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CMS_MESSAGE_CODE,
  DEFAULT_MAINTENANCE_MESSAGE,
  isBotOperationalStatus,
  type BotOperationalStatus,
  type BotOperationalStatusCode,
} from "@/lib/bot-operational-status/types";

const MAX_MESSAGE_LENGTH = 1000;

function mapRow(data: Record<string, unknown>): BotOperationalStatus {
  const status = isBotOperationalStatus(data.status) ? data.status : "ACTIVE";
  const message =
    typeof data.maintenance_message === "string" &&
    data.maintenance_message.trim()
      ? data.maintenance_message.trim()
      : DEFAULT_MAINTENANCE_MESSAGE;
  const cmsCode =
    typeof data.cms_message_code === "string" && data.cms_message_code.trim()
      ? data.cms_message_code.trim().toUpperCase()
      : DEFAULT_CMS_MESSAGE_CODE;

  return {
    status,
    maintenanceMessage: message,
    cmsMessageCode: cmsCode,
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
    updatedByEmail:
      typeof data.updated_by_email === "string" ? data.updated_by_email : null,
    updatedById:
      typeof data.updated_by_id === "string" ? data.updated_by_id : null,
  };
}

/** Lectura de la misma fila que consulta el bot (SYS-001). */
export async function getBotOperationalStatus(): Promise<BotOperationalStatus> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_operational_status")
    .select(
      "status, maintenance_message, cms_message_code, updated_at, updated_by_email, updated_by_id",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message.includes("does not exist") ||
        error.message.includes("schema cache")
        ? "Tabla bot_operational_status no encontrada. Aplica migración 012 (o 043 del MVP)."
        : error.message,
    );
  }

  if (!data) {
    return {
      status: "ACTIVE",
      maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      cmsMessageCode: DEFAULT_CMS_MESSAGE_CODE,
      updatedAt: null,
      updatedByEmail: null,
      updatedById: null,
    };
  }

  return mapRow(data as Record<string, unknown>);
}

async function syncCmsMaintenanceMessage(body: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("bot_messages")
    .update({
      body,
      status: "PUBLISHED",
      is_active: true,
      updated_at: now,
    })
    .eq("code", DEFAULT_CMS_MESSAGE_CODE)
    .select("id");

  if (updateError) {
    console.warn("[ops-sys-001] sync CMS skipped:", updateError.message);
    return;
  }

  if (updated && updated.length > 0) return;

  const { data: cat } = await supabase
    .from("bot_message_categories")
    .select("id")
    .eq("code", "SYSTEM")
    .maybeSingle();

  const { error: insertError } = await supabase.from("bot_messages").insert({
    code: DEFAULT_CMS_MESSAGE_CODE,
    name: "Bot en mantenimiento",
    category_id: cat?.id ?? null,
    body,
    available_variables: [],
    status: "PUBLISHED",
    version: 1,
    is_active: true,
    content_type: "text",
    module: "SYSTEM",
    environment: "PRODUCTION",
    interactive_payload: {},
    updated_at: now,
  });

  if (insertError) {
    console.warn("[ops-sys-001] CMS insert skipped:", insertError.message);
  }
}

/**
 * Actualiza la misma configuración que lee el bot.
 * Sincroniza `bot_messages.SYS_BOT_MAINTENANCE` (mismo patrón que MVP).
 */
export async function updateBotOperationalStatus(input: {
  status: BotOperationalStatusCode;
  maintenanceMessage: string;
  actorEmail?: string | null;
  actorId?: string | null;
}): Promise<BotOperationalStatus> {
  if (!isBotOperationalStatus(input.status)) {
    throw new Error("Estado inválido (ACTIVE | MAINTENANCE)");
  }

  const message =
    input.maintenanceMessage.trim() || DEFAULT_MAINTENANCE_MESSAGE;
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`,
    );
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("bot_operational_status")
    .upsert(
      {
        id: 1,
        status: input.status,
        maintenance_message: message,
        cms_message_code: DEFAULT_CMS_MESSAGE_CODE,
        updated_at: now,
        updated_by_email: input.actorEmail ?? null,
        updated_by_id: input.actorId ?? null,
      },
      { onConflict: "id" },
    )
    .select(
      "status, maintenance_message, cms_message_code, updated_at, updated_by_email, updated_by_id",
    )
    .single();

  if (error) {
    throw new Error(
      error.message.includes("does not exist") ||
        error.message.includes("schema cache")
        ? "Tabla bot_operational_status no encontrada. Aplica migración 012 (o 043 del MVP)."
        : error.message,
    );
  }

  await syncCmsMaintenanceMessage(message);
  return mapRow(data as Record<string, unknown>);
}
