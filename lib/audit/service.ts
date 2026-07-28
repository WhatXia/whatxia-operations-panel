import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditInput, AuditLogRow } from "@/lib/audit/types";

/**
 * Servicio centralizado de auditoría.
 * Toda escritura relevante del Operations Center debe pasar por aquí.
 */
export async function writeAuditLog(input: AuditInput): Promise<string | null> {
  const started = Date.now();

  try {
    const supabase = createAdminClient();
    const row = {
      user_email: input.userEmail ?? null,
      user_id: input.userId ?? null,
      role: input.role ?? null,
      session_id: input.sessionId ?? null,
      ip_address: input.ipAddress ?? null,
      browser: input.browser ?? null,
      os: input.os ?? null,
      device: input.device ?? null,
      path: input.path ?? null,
      module: input.module ?? null,
      action: input.action,
      resource: input.resource ?? null,
      resource_id: input.resourceId ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      result: input.result,
      message: input.message ?? null,
      duration_ms:
        input.durationMs ?? Math.max(0, Date.now() - started),
      requires_reauthentication: Boolean(input.requiresReauthentication),
      reauthentication_result: input.reauthenticationResult ?? null,
    };

    const { data, error } = await supabase
      .from("audit_logs")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error) {
      // Compatibilidad si aún no se aplicó migración 003.
      if (
        error.message?.includes("requires_reauthentication") ||
        error.message?.includes("reauthentication_result") ||
        error.code === "PGRST204"
      ) {
          const {
            requires_reauthentication: _requires,
            reauthentication_result: _result,
            ...legacy
          } = row;
          void _requires;
          void _result;
        const fallbackNewValues = {
          ...(typeof legacy.new_values === "object" && legacy.new_values
            ? legacy.new_values
            : {}),
          requires_reauthentication: row.requires_reauthentication,
          reauthentication_result: row.reauthentication_result,
        };
        const { data: legacyData, error: legacyError } = await supabase
          .from("audit_logs")
          .insert({
            ...legacy,
            new_values: fallbackNewValues,
            message: legacy.message
              ? `${legacy.message} [reauth=${row.reauthentication_result ?? "n/a"}]`
              : `reauth=${row.reauthentication_result ?? "n/a"}`,
          })
          .select("id")
          .maybeSingle();

        if (legacyError) {
          console.error("[audit] insert failed:", legacyError.message);
          return null;
        }
        return (legacyData as { id?: string } | null)?.id ?? null;
      }

      console.error("[audit] insert failed:", error.message);
      return null;
    }

    return (data as { id?: string } | null)?.id ?? null;
  } catch (error) {
    console.error("[audit] unexpected error:", error);
    return null;
  }
}

export async function writeAuditLogSafe(input: AuditInput): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("[audit] safe write failed:", error);
  }
}

export type AuditQueryFilters = {
  userEmail?: string | null;
  module?: string | null;
  action?: string | null;
  result?: "OK" | "ERROR" | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
  sort?: "newest" | "oldest";
  limit?: number;
};

export async function queryAuditLogs(
  filters: AuditQueryFilters = {},
): Promise<AuditLogRow[]> {
  const supabase = createAdminClient();
  const limit = filters.limit ?? 100;
  const ascending = filters.sort === "oldest";

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending })
    .limit(limit);

  if (filters.userEmail) {
    query = query.ilike("user_email", `%${filters.userEmail}%`);
  }
  if (filters.module) {
    query = query.eq("module", filters.module);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.result) {
    query = query.eq("result", filters.result);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }
  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(
      `message.ilike.%${q}%,path.ilike.%${q}%,resource.ilike.%${q}%,action.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Error al consultar auditoría");
  }

  return (data ?? []) as AuditLogRow[];
}

export async function getAuditLogById(id: string): Promise<AuditLogRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Error al consultar evento");
  }

  return (data as AuditLogRow | null) ?? null;
}
