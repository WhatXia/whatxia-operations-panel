import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeLabel } from "@/lib/dashboard/time";
import type {
  DeactivateLaunchProgramResult,
  LaunchProgramDashboard,
  LaunchProgramDetail,
  LaunchProgramListItem,
  LaunchProgramRow,
  LaunchProgramUpdateInput,
} from "@/lib/launch-programs/types";
import { PIONEERS_USERS_CODE } from "@/lib/launch-programs/types";

type DbRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_quota: number | null;
  auto_activate_on_end: boolean;
  welcome_message: string | null;
  activation_message: string | null;
  mass_activated_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): LaunchProgramRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: Boolean(row.is_active),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxQuota: row.max_quota,
    autoActivateOnEnd: Boolean(row.auto_activate_on_end),
    welcomeMessage: row.welcome_message,
    activationMessage: row.activation_message,
    massActivatedAt: row.mass_activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hrefForCode(code: string): string {
  if (code === PIONEERS_USERS_CODE) {
    return "/admin/parametros/programas-lanzamiento/pioneros";
  }
  return `/admin/parametros/programas-lanzamiento/${code.toLowerCase()}`;
}

async function countPioneers(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { count, error } = await supabase
    .from("passengers")
    .select("id", { count: "exact", head: true })
    .eq("status", "PIONEER");
  if (error) {
    throw new Error(error.message || "Error al contar pioneros");
  }
  return count ?? 0;
}

function buildDashboard(
  row: LaunchProgramRow,
  registeredPioneers: number,
): LaunchProgramDashboard {
  const pending = registeredPioneers;
  const quotaLabel =
    row.maxQuota != null
      ? `${registeredPioneers} / ${row.maxQuota}`
      : `${registeredPioneers} / ∞`;

  return {
    isActive: row.isActive,
    registeredPioneers,
    maxQuota: row.maxQuota,
    quotaLabel,
    startsAt: row.startsAt,
    startsAtLabel: formatDateTimeLabel(row.startsAt),
    endsAt: row.endsAt,
    endsAtLabel: formatDateTimeLabel(row.endsAt),
    pendingActivation: pending,
    massActivatedAt: row.massActivatedAt,
    massActivatedAtLabel: formatDateTimeLabel(row.massActivatedAt),
  };
}

export async function listLaunchPrograms(): Promise<LaunchProgramListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("launch_programs")
    .select("code, name, description, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Error al listar programas");
  }

  return ((data ?? []) as Array<{
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
  }>).map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: Boolean(row.is_active),
    href: hrefForCode(row.code),
  }));
}

export async function fetchLaunchProgramByCode(
  code: string,
): Promise<LaunchProgramDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("launch_programs")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Error al leer programa");
  }
  if (!data) return null;

  const row = mapRow(data as DbRow);
  const pioneers = await countPioneers(supabase);
  const dashboard = buildDashboard(row, pioneers);

  return {
    ...row,
    dashboard,
    startsAtLabel: dashboard.startsAtLabel,
    endsAtLabel: dashboard.endsAtLabel,
    massActivatedAtLabel: dashboard.massActivatedAtLabel,
    updatedAtLabel: formatDateTimeLabel(row.updatedAt),
  };
}

export async function updateLaunchProgramFields(
  code: string,
  input: LaunchProgramUpdateInput,
): Promise<LaunchProgramDetail> {
  const supabase = createAdminClient();
  const current = await fetchLaunchProgramByCode(code);
  if (!current) {
    throw new Error("Programa no encontrado");
  }

  // Activar/desactivar se maneja en endpoints dedicados.
  if (input.isActive === false && current.isActive) {
    throw new Error(
      "Usa la desactivación del programa para pasar PIONEER → ACTIVE",
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.isActive === true) {
    patch.is_active = true;
  }
  if ("startsAt" in input) patch.starts_at = input.startsAt;
  if ("endsAt" in input) patch.ends_at = input.endsAt;
  if ("maxQuota" in input) patch.max_quota = input.maxQuota;
  if ("autoActivateOnEnd" in input) {
    patch.auto_activate_on_end = Boolean(input.autoActivateOnEnd);
  }
  if ("welcomeMessage" in input) {
    patch.welcome_message = input.welcomeMessage;
  }
  if ("activationMessage" in input) {
    patch.activation_message = input.activationMessage;
  }

  if (
    patch.starts_at &&
    patch.ends_at &&
    new Date(String(patch.starts_at)).getTime() >
      new Date(String(patch.ends_at)).getTime()
  ) {
    throw new Error("La fecha de finalización debe ser posterior al inicio");
  }

  const { error } = await supabase
    .from("launch_programs")
    .update(patch)
    .eq("code", code);

  if (error) {
    throw new Error(error.message || "Error al actualizar programa");
  }

  const next = await fetchLaunchProgramByCode(code);
  if (!next) throw new Error("Programa no encontrado tras actualizar");
  return next;
}

export async function deactivateLaunchProgram(
  code: string,
  actor: { email?: string | null; id?: string | null },
  triggerSource: "manual" | "auto_end" | "api" = "manual",
): Promise<{
  detail: LaunchProgramDetail;
  result: DeactivateLaunchProgramResult;
}> {
  const supabase = createAdminClient();
  const current = await fetchLaunchProgramByCode(code);
  if (!current) {
    throw new Error("Programa no encontrado");
  }

  const { data, error } = await supabase.rpc("deactivate_launch_program", {
    p_program_id: current.id,
    p_trigger_source: triggerSource,
    p_actor_email: actor.email ?? null,
    p_actor_id: actor.id ?? null,
  });

  if (error) {
    throw new Error(error.message || "Error al desactivar programa");
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  const result: DeactivateLaunchProgramResult = {
    ok: true,
    alreadyInactive: Boolean(raw.already_inactive),
    activatedCount: Number(raw.activated_count ?? 0),
    runId: typeof raw.run_id === "string" ? raw.run_id : null,
    queuedMessages: Boolean(raw.queued_messages),
  };

  const detail = await fetchLaunchProgramByCode(code);
  if (!detail) throw new Error("Programa no encontrado tras desactivar");
  return { detail, result };
}

export async function fetchPendingOutboundMessages(limit = 50): Promise<
  Array<{
    id: string;
    phone: string;
    body: string;
  }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("launch_program_outbound_messages")
    .select("id, phone, body")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Error al leer cola de mensajes");
  }

  return (data ?? []) as Array<{ id: string; phone: string; body: string }>;
}

export async function markOutboundMessage(
  id: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("launch_program_outbound_messages")
    .update({
      status,
      error: errorMessage ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Error al actualizar mensaje outbound");
  }
}
