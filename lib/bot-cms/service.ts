import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractVariablesFromBody,
  isBotContentType,
  isBotEnvironment,
  isValidMessageCode,
  normalizeInteractivePayload,
  normalizeLocationPayload,
  previewMessageBody,
  type BotCategory,
  type BotContentType,
  type BotEnvironment,
  type BotInteractivePayload,
  type BotLocationPayload,
  type BotMediaAsset,
  type BotMediaType,
  type BotMessageDetail,
  type BotMessageListItem,
  type BotMessageStatus,
  type BotMessageVersion,
} from "@/lib/bot-cms/types";

type Actor = {
  id?: string | null;
  email?: string | null;
};

function mapMedia(row: Record<string, unknown>): BotMediaAsset {
  const publicUrl = (row.public_url as string | null) ?? null;
  const externalUrl = (row.external_url as string | null) ?? null;
  return {
    id: String(row.id),
    code: (row.code as string | null) ?? null,
    name: String(row.name ?? ""),
    description: (row.description as string | null) ?? null,
    media_type: row.media_type as BotMediaType,
    mime_type: (row.mime_type as string | null) ?? null,
    size_bytes: row.size_bytes == null ? null : Number(row.size_bytes),
    storage_path: (row.storage_path as string | null) ?? null,
    public_url: publicUrl,
    external_url: externalUrl,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    status: (row.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
    created_by_email: (row.created_by_email as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    previewUrl: publicUrl || externalUrl,
  };
}

export async function listCategories(): Promise<BotCategory[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_message_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BotCategory[];
}

export async function createCategory(input: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<BotCategory> {
  const code = input.code.trim().toUpperCase();
  if (!isValidMessageCode(code)) {
    throw new Error("Código de categoría inválido (ej: BIENVENIDA)");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_message_categories")
    .insert({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo crear categoría");
  return data as BotCategory;
}

export async function updateCategory(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
  }>,
): Promise<BotCategory> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (typeof input.is_active === "boolean") patch.is_active = input.is_active;
  if (typeof input.sort_order === "number") patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("bot_message_categories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo actualizar");
  return data as BotCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("bot_messages")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar: hay mensajes en esta categoría");
  }
  const { error } = await supabase
    .from("bot_message_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function mediaCountMap(messageIds: string[]) {
  const map = new Map<string, number>();
  if (messageIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bot_message_media")
    .select("message_id")
    .in("message_id", messageIds);
  for (const row of data ?? []) {
    const id = String((row as { message_id: string }).message_id);
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function listMessages(filters?: {
  q?: string;
  categoryId?: string;
  status?: string;
  tag?: string;
  environment?: string;
  module?: string;
}): Promise<BotMessageListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_messages")
    .select("*, bot_message_categories(name)")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((r) => String(r.id));
  const counts = await mediaCountMap(ids);

  let tagMatchIds: Set<string> | null = null;
  if (filters?.tag) {
    const tag = filters.tag.toLowerCase();
    const { data: media } = await supabase
      .from("bot_media_assets")
      .select("id, tags")
      .contains("tags", [filters.tag]);
    // fallback partial match
    const { data: allMedia } = await supabase
      .from("bot_media_assets")
      .select("id, tags")
      .limit(1000);
    const mediaIds = (allMedia ?? [])
      .filter((m) =>
        (Array.isArray(m.tags) ? m.tags : []).some((t: string) =>
          String(t).toLowerCase().includes(tag),
        ),
      )
      .map((m) => String(m.id));
    void media;
    if (mediaIds.length > 0) {
      const { data: links } = await supabase
        .from("bot_message_media")
        .select("message_id")
        .in("media_id", mediaIds);
      tagMatchIds = new Set(
        (links ?? []).map((l) => String((l as { message_id: string }).message_id)),
      );
    } else {
      tagMatchIds = new Set();
    }
  }

  let items: BotMessageListItem[] = rows.map((row) => {
    const cat = row.bot_message_categories as { name?: string } | null;
    const vars = Array.isArray(row.available_variables)
      ? (row.available_variables as string[])
      : [];
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      body: String(row.body ?? ""),
      status: row.status as BotMessageStatus,
      version: Number(row.version ?? 1),
      is_active: Boolean(row.is_active),
      category_id: (row.category_id as string | null) ?? null,
      categoryName: cat?.name ?? null,
      content_type: isBotContentType(row.content_type)
        ? row.content_type
        : "text",
      module: (row.module as string | null) ?? null,
      environment: isBotEnvironment(row.environment)
        ? row.environment
        : "PRODUCTION",
      available_variables: vars,
      mediaCount: counts.get(String(row.id)) ?? 0,
      updated_at: String(row.updated_at),
      updated_by_email: (row.updated_by_email as string | null) ?? null,
      created_at: String(row.created_at),
      created_by_email: (row.created_by_email as string | null) ?? null,
    };
  });

  const q = filters?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((item) => {
      const blob = [
        item.code,
        item.name,
        item.body,
        item.categoryName,
        item.module,
        item.environment,
        ...item.available_variables,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }
  if (filters?.categoryId) {
    items = items.filter((item) => item.category_id === filters.categoryId);
  }
  if (filters?.status) {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters?.environment) {
    items = items.filter((item) => item.environment === filters.environment);
  }
  if (filters?.module) {
    items = items.filter((item) => item.module === filters.module);
  }
  if (tagMatchIds) {
    items = items.filter((item) => tagMatchIds!.has(item.id));
  }

  return items;
}

export async function getMessageDetail(id: string): Promise<BotMessageDetail> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_messages")
    .select("*, bot_message_categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Mensaje no encontrado");

  const { data: links } = await supabase
    .from("bot_message_media")
    .select("media_id, sort_order")
    .eq("message_id", id)
    .order("sort_order", { ascending: true });

  const mediaIds = (links ?? []).map((l) => String(l.media_id));
  let media: BotMediaAsset[] = [];
  if (mediaIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("bot_media_assets")
      .select("*")
      .in("id", mediaIds);
    const byId = new Map(
      (mediaRows ?? []).map((row) => [String(row.id), mapMedia(row)]),
    );
    media = mediaIds
      .map((mediaId) => byId.get(mediaId))
      .filter(Boolean) as BotMediaAsset[];
  }

  const cat = data.bot_message_categories as { name?: string } | null;
  const vars = Array.isArray(data.available_variables)
    ? (data.available_variables as string[])
    : extractVariablesFromBody(String(data.body ?? ""));

  return {
    id: String(data.id),
    code: String(data.code),
    name: String(data.name),
    body: String(data.body ?? ""),
    status: data.status as BotMessageStatus,
    version: Number(data.version ?? 1),
    is_active: Boolean(data.is_active),
    category_id: (data.category_id as string | null) ?? null,
    categoryName: cat?.name ?? null,
    content_type: isBotContentType(data.content_type)
      ? data.content_type
      : "text",
    module: (data.module as string | null) ?? null,
    environment: isBotEnvironment(data.environment)
      ? data.environment
      : "PRODUCTION",
    available_variables: vars,
    mediaCount: media.length,
    mediaIds,
    media,
    location_payload: normalizeLocationPayload(data.location_payload),
    interactive_payload: normalizeInteractivePayload(data.interactive_payload),
    updated_at: String(data.updated_at),
    updated_by_email: (data.updated_by_email as string | null) ?? null,
    created_at: String(data.created_at),
    created_by_email: (data.created_by_email as string | null) ?? null,
    previewHtml: previewMessageBody(String(data.body ?? "")),
  };
}

async function snapshotVersion(
  messageId: string,
  actor: Actor,
  note: string | null,
) {
  const detail = await getMessageDetail(messageId);
  const supabase = createAdminClient();
  const { error } = await supabase.from("bot_message_versions").insert({
    message_id: messageId,
    version: detail.version,
    body: detail.body,
    name: detail.name,
    status: detail.status,
    available_variables: detail.available_variables,
    media_ids: detail.mediaIds,
    category_id: detail.category_id,
    is_active: detail.is_active,
    content_type: detail.content_type,
    module: detail.module,
    environment: detail.environment,
    location_payload: detail.location_payload,
    interactive_payload: detail.interactive_payload,
    changed_by_email: actor.email ?? null,
    changed_by_id: actor.id ?? null,
    change_note: note,
  });
  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createMessage(
  input: {
    code: string;
    name: string;
    body?: string;
    category_id?: string | null;
    status?: BotMessageStatus;
    mediaIds?: string[];
    content_type?: BotContentType;
    module?: string | null;
    environment?: BotEnvironment;
    location_payload?: BotLocationPayload | null;
    interactive_payload?: BotInteractivePayload;
  },
  actor: Actor,
): Promise<BotMessageDetail> {
  const code = input.code.trim().toUpperCase();
  if (!isValidMessageCode(code)) {
    throw new Error("ID inválido. Use formato WELCOME_MESSAGE");
  }
  const body = input.body ?? "";
  const vars = extractVariablesFromBody(body);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bot_messages")
    .insert({
      code,
      name: input.name.trim(),
      body,
      category_id: input.category_id || null,
      available_variables: vars,
      status: input.status ?? "DRAFT",
      content_type: input.content_type ?? "text",
      module: input.module?.trim() || null,
      environment: input.environment ?? "PRODUCTION",
      location_payload: input.location_payload ?? null,
      interactive_payload:
        input.interactive_payload ?? normalizeInteractivePayload({}),
      version: 1,
      created_by_email: actor.email ?? null,
      created_by_id: actor.id ?? null,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message || "No se pudo crear mensaje");

  if (input.mediaIds?.length) {
    await setMessageMedia(String(data.id), input.mediaIds);
  }

  await snapshotVersion(String(data.id), actor, "Creación");
  return getMessageDetail(String(data.id));
}

export async function updateMessage(
  id: string,
  input: {
    name?: string;
    body?: string;
    category_id?: string | null;
    status?: BotMessageStatus;
    is_active?: boolean;
    mediaIds?: string[];
    content_type?: BotContentType;
    module?: string | null;
    environment?: BotEnvironment;
    location_payload?: BotLocationPayload | null;
    interactive_payload?: BotInteractivePayload;
  },
  actor: Actor,
): Promise<BotMessageDetail> {
  const before = await getMessageDetail(id);
  await snapshotVersion(id, actor, "Edición previa");

  const body = input.body ?? before.body;
  const vars = extractVariablesFromBody(body);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bot_messages")
    .update({
      name: input.name?.trim() ?? before.name,
      body,
      category_id:
        input.category_id !== undefined ? input.category_id : before.category_id,
      available_variables: vars,
      status: input.status ?? before.status,
      is_active:
        typeof input.is_active === "boolean" ? input.is_active : before.is_active,
      content_type: input.content_type ?? before.content_type,
      module:
        input.module !== undefined
          ? input.module?.trim() || null
          : before.module,
      environment: input.environment ?? before.environment,
      location_payload:
        input.location_payload !== undefined
          ? input.location_payload
          : before.location_payload,
      interactive_payload:
        input.interactive_payload !== undefined
          ? input.interactive_payload
          : before.interactive_payload,
      version: before.version + 1,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (input.mediaIds) {
    await setMessageMedia(id, input.mediaIds);
  }

  return getMessageDetail(id);
}

export async function setMessageMedia(messageId: string, mediaIds: string[]) {
  const supabase = createAdminClient();
  await supabase.from("bot_message_media").delete().eq("message_id", messageId);
  if (mediaIds.length === 0) return;
  const rows = mediaIds.map((mediaId, index) => ({
    message_id: messageId,
    media_id: mediaId,
    sort_order: index,
  }));
  const { error } = await supabase.from("bot_message_media").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteMessage(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bot_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listMessageVersions(
  messageId: string,
): Promise<BotMessageVersion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_message_versions")
    .select("*")
    .eq("message_id", messageId)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    message_id: String(row.message_id),
    version: Number(row.version),
    body: String(row.body),
    name: String(row.name),
    status: row.status as BotMessageStatus,
    available_variables: Array.isArray(row.available_variables)
      ? (row.available_variables as string[])
      : [],
    media_ids: Array.isArray(row.media_ids) ? (row.media_ids as string[]) : [],
    category_id: (row.category_id as string | null) ?? null,
    is_active: Boolean(row.is_active),
    content_type: isBotContentType(row.content_type) ? row.content_type : null,
    module: (row.module as string | null) ?? null,
    environment: isBotEnvironment(row.environment) ? row.environment : null,
    location_payload: normalizeLocationPayload(row.location_payload),
    interactive_payload: row.interactive_payload
      ? normalizeInteractivePayload(row.interactive_payload)
      : null,
    changed_by_email: (row.changed_by_email as string | null) ?? null,
    change_note: (row.change_note as string | null) ?? null,
    created_at: String(row.created_at),
  }));
}

export async function restoreMessageVersion(
  messageId: string,
  versionId: string,
  actor: Actor,
): Promise<BotMessageDetail> {
  const versions = await listMessageVersions(messageId);
  const target = versions.find((v) => v.id === versionId);
  if (!target) throw new Error("Versión no encontrada");

  return updateMessage(
    messageId,
    {
      name: target.name,
      body: target.body,
      category_id: target.category_id,
      status: target.status,
      is_active: target.is_active,
      mediaIds: target.media_ids,
      content_type: target.content_type ?? undefined,
      module: target.module,
      environment: target.environment ?? undefined,
      location_payload: target.location_payload,
      interactive_payload: target.interactive_payload ?? undefined,
    },
    actor,
  );
}

export async function listMedia(filters?: {
  q?: string;
  type?: string;
  tag?: string;
}): Promise<BotMediaAsset[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("bot_media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters?.type) query = query.eq("media_type", filters.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let items = (data ?? []).map((row) => mapMedia(row));
  const q = filters?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((item) =>
      [item.name, item.description, item.code, ...item.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters?.tag) {
    const tag = filters.tag.toLowerCase();
    items = items.filter((item) =>
      item.tags.some((t) => t.toLowerCase().includes(tag)),
    );
  }
  return items;
}

export async function createMediaFromUrl(
  input: {
    name: string;
    description?: string | null;
    media_type: BotMediaType;
    external_url: string;
    tags?: string[];
    code?: string | null;
  },
  actor: Actor,
): Promise<BotMediaAsset> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_media_assets")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      media_type: input.media_type,
      external_url: input.external_url.trim(),
      public_url: input.external_url.trim(),
      tags: input.tags ?? [],
      code: input.code?.trim().toUpperCase() || null,
      status: "ACTIVE",
      created_by_email: actor.email ?? null,
      created_by_id: actor.id ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo crear media");
  return mapMedia(data);
}

export async function uploadMediaFile(
  input: {
    fileName: string;
    contentType: string;
    bytes: Uint8Array;
    name: string;
    description?: string | null;
    media_type: BotMediaType;
    tags?: string[];
  },
  actor: Actor,
): Promise<BotMediaAsset> {
  const supabase = createAdminClient();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.media_type}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("bot-cms-media")
    .upload(path, input.bytes, {
      contentType: input.contentType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "No se pudo subir el archivo. ¿Aplicaste la migración 004 (bucket)?",
    );
  }

  const { data: signed } = await supabase.storage
    .from("bot-cms-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  const { data, error } = await supabase
    .from("bot_media_assets")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      media_type: input.media_type,
      mime_type: input.contentType || null,
      size_bytes: input.bytes.byteLength,
      storage_path: path,
      public_url: signed?.signedUrl ?? null,
      tags: input.tags ?? [],
      status: "ACTIVE",
      created_by_email: actor.email ?? null,
      created_by_id: actor.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "No se pudo registrar media");
  return mapMedia(data);
}

export async function updateMedia(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    tags: string[];
    status: "ACTIVE" | "INACTIVE";
  }>,
): Promise<BotMediaAsset> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.tags) patch.tags = input.tags;
  if (input.status) patch.status = input.status;

  const { data, error } = await supabase
    .from("bot_media_assets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo actualizar media");
  return mapMedia(data);
}

export async function deleteMedia(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from("bot_media_assets")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("bot_media_assets").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (asset?.storage_path) {
    await supabase.storage.from("bot-cms-media").remove([String(asset.storage_path)]);
  }
}
