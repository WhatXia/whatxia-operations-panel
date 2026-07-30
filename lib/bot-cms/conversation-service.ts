import { createAdminClient } from "@/lib/supabase/admin";
import {
  isBotAudience,
  isBotEdgeTriggerType,
  isBotEnvironmentSafe,
  mapEdgeRow,
  mapNodeRow,
  type BotAudience,
  type BotConversationEdge,
  type BotConversationNode,
  type BotConversationTreeDetail,
  type BotConversationTreeListItem,
  type BotConversationTreeVersion,
  type BotEdgeTriggerType,
  type PublishedConversationTree,
} from "@/lib/bot-cms/conversation-types";
import {
  extractVariablesFromBody,
  isBotContentType,
  isValidMessageCode,
  normalizeInteractivePayload,
  normalizeLocationPayload,
  type BotContentType,
  type BotEnvironment,
  type BotInteractivePayload,
  type BotLocationPayload,
  type BotMessageStatus,
} from "@/lib/bot-cms/types";

type Actor = { id?: string | null; email?: string | null };

async function nodeMediaMap(nodeIds: string[]) {
  const map = new Map<string, string[]>();
  if (nodeIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bot_conversation_node_media")
    .select("node_id, media_id, sort_order")
    .in("node_id", nodeIds)
    .order("sort_order", { ascending: true });
  for (const row of data ?? []) {
    const nodeId = String((row as { node_id: string }).node_id);
    const mediaId = String((row as { media_id: string }).media_id);
    const list = map.get(nodeId) ?? [];
    list.push(mediaId);
    map.set(nodeId, list);
  }
  return map;
}

export async function listConversationTrees(filters?: {
  audience?: string;
  status?: string;
  q?: string;
}): Promise<BotConversationTreeListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_conversation_trees")
    .select("*")
    .order("audience", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  const trees = data ?? [];
  const ids = trees.map((t) => String(t.id));
  const nodeCounts = new Map<string, number>();
  const edgeCounts = new Map<string, number>();

  if (ids.length > 0) {
    const { data: nodes } = await supabase
      .from("bot_conversation_nodes")
      .select("tree_id")
      .in("tree_id", ids);
    for (const row of nodes ?? []) {
      const id = String((row as { tree_id: string }).tree_id);
      nodeCounts.set(id, (nodeCounts.get(id) ?? 0) + 1);
    }
    const { data: edges } = await supabase
      .from("bot_conversation_edges")
      .select("tree_id")
      .in("tree_id", ids);
    for (const row of edges ?? []) {
      const id = String((row as { tree_id: string }).tree_id);
      edgeCounts.set(id, (edgeCounts.get(id) ?? 0) + 1);
    }
  }

  let items: BotConversationTreeListItem[] = trees.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    audience: isBotAudience(row.audience) ? row.audience : "PASSENGER",
    status: row.status as BotMessageStatus,
    version: Number(row.version ?? 1),
    is_active: Boolean(row.is_active),
    environment: isBotEnvironmentSafe(row.environment)
      ? row.environment
      : "PRODUCTION",
    root_node_id: (row.root_node_id as string | null) ?? null,
    nodeCount: nodeCounts.get(String(row.id)) ?? 0,
    edgeCount: edgeCounts.get(String(row.id)) ?? 0,
    updated_at: String(row.updated_at),
    updated_by_email: (row.updated_by_email as string | null) ?? null,
  }));

  if (filters?.audience) {
    items = items.filter((item) => item.audience === filters.audience);
  }
  if (filters?.status) {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter((item) =>
      [item.code, item.name, item.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return items;
}

export async function getConversationTreeDetail(
  idOrCode: string,
): Promise<BotConversationTreeDetail> {
  const supabase = createAdminClient();
  const byId = idOrCode.includes("-");
  const { data, error } = await supabase
    .from("bot_conversation_trees")
    .select("*")
    .eq(byId ? "id" : "code", idOrCode)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Árbol no encontrado");

  const treeId = String(data.id);
  const { data: nodeRows, error: nodeError } = await supabase
    .from("bot_conversation_nodes")
    .select("*")
    .eq("tree_id", treeId)
    .order("sort_order", { ascending: true });
  if (nodeError) throw new Error(nodeError.message);

  const { data: edgeRows, error: edgeError } = await supabase
    .from("bot_conversation_edges")
    .select("*")
    .eq("tree_id", treeId)
    .order("sort_order", { ascending: true });
  if (edgeError) throw new Error(edgeError.message);

  const nodesRaw = nodeRows ?? [];
  const mediaMap = await nodeMediaMap(nodesRaw.map((n) => String(n.id)));
  const nodes = nodesRaw.map((row) =>
    mapNodeRow(row as Record<string, unknown>, mediaMap.get(String(row.id)) ?? []),
  );
  const edges = (edgeRows ?? []).map((row) =>
    mapEdgeRow(row as Record<string, unknown>),
  );

  return {
    id: treeId,
    code: String(data.code),
    name: String(data.name),
    description: (data.description as string | null) ?? null,
    audience: isBotAudience(data.audience) ? data.audience : "PASSENGER",
    status: data.status as BotMessageStatus,
    version: Number(data.version ?? 1),
    is_active: Boolean(data.is_active),
    environment: isBotEnvironmentSafe(data.environment)
      ? data.environment
      : "PRODUCTION",
    root_node_id: (data.root_node_id as string | null) ?? null,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    updated_at: String(data.updated_at),
    updated_by_email: (data.updated_by_email as string | null) ?? null,
    nodes,
    edges,
  };
}

async function snapshotTree(
  treeId: string,
  actor: Actor,
  note: string | null,
) {
  const detail = await getConversationTreeDetail(treeId);
  const supabase = createAdminClient();
  const { error } = await supabase.from("bot_conversation_tree_versions").insert({
    tree_id: treeId,
    version: detail.version,
    status: detail.status,
    snapshot: detail,
    change_note: note,
    changed_by_email: actor.email ?? null,
    changed_by_id: actor.id ?? null,
  });
  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createConversationTree(
  input: {
    code: string;
    name: string;
    description?: string | null;
    audience: BotAudience;
    environment?: BotEnvironment;
  },
  actor: Actor,
): Promise<BotConversationTreeDetail> {
  const code = input.code.trim().toUpperCase();
  if (!isValidMessageCode(code)) {
    throw new Error("Código inválido (ej: PASSENGER_FLOW)");
  }
  if (!isBotAudience(input.audience)) {
    throw new Error("Audiencia inválida");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_conversation_trees")
    .insert({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      audience: input.audience,
      environment: input.environment ?? "PRODUCTION",
      status: "DRAFT",
      version: 1,
      created_by_email: actor.email ?? null,
      created_by_id: actor.id ?? null,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo crear árbol");
  await snapshotTree(String(data.id), actor, "Creación");
  return getConversationTreeDetail(String(data.id));
}

export async function updateConversationTree(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    status: BotMessageStatus;
    is_active: boolean;
    environment: BotEnvironment;
    root_node_id: string | null;
  }>,
  actor: Actor,
): Promise<BotConversationTreeDetail> {
  await snapshotTree(id, actor, "Edición de árbol");
  const before = await getConversationTreeDetail(id);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bot_conversation_trees")
    .update({
      name: input.name?.trim() ?? before.name,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : before.description,
      status: input.status ?? before.status,
      is_active:
        typeof input.is_active === "boolean" ? input.is_active : before.is_active,
      environment: input.environment ?? before.environment,
      root_node_id:
        input.root_node_id !== undefined
          ? input.root_node_id
          : before.root_node_id,
      version: before.version + 1,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return getConversationTreeDetail(id);
}

export async function deleteConversationTree(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bot_conversation_trees")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function setNodeMedia(nodeId: string, mediaIds: string[]) {
  const supabase = createAdminClient();
  await supabase.from("bot_conversation_node_media").delete().eq("node_id", nodeId);
  if (mediaIds.length === 0) return;
  const rows = mediaIds.map((mediaId, index) => ({
    node_id: nodeId,
    media_id: mediaId,
    sort_order: index,
  }));
  const { error } = await supabase.from("bot_conversation_node_media").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createConversationNode(
  treeId: string,
  input: {
    code: string;
    name: string;
    stage?: string | null;
    content_type?: BotContentType;
    body?: string;
    interactive_payload?: BotInteractivePayload;
    location_payload?: BotLocationPayload | null;
    message_code?: string | null;
    is_entry?: boolean;
    mediaIds?: string[];
    position_x?: number;
    position_y?: number;
  },
  actor: Actor,
): Promise<BotConversationNode> {
  const code = input.code.trim().toUpperCase();
  if (!isValidMessageCode(code)) {
    throw new Error("Código de nodo inválido");
  }
  await snapshotTree(treeId, actor, `Crear nodo ${code}`);
  const body = input.body ?? "";
  const supabase = createAdminClient();
  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version")
    .eq("id", treeId)
    .single();

  const { data, error } = await supabase
    .from("bot_conversation_nodes")
    .insert({
      tree_id: treeId,
      code,
      name: input.name.trim(),
      stage: input.stage?.trim() || null,
      content_type: input.content_type ?? "text",
      body,
      available_variables: extractVariablesFromBody(body),
      interactive_payload:
        input.interactive_payload ?? normalizeInteractivePayload({}),
      location_payload: input.location_payload ?? null,
      message_code: input.message_code?.trim() || null,
      is_entry: Boolean(input.is_entry),
      position_x: input.position_x ?? 40,
      position_y: input.position_y ?? 40,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo crear nodo");

  if (input.mediaIds) await setNodeMedia(String(data.id), input.mediaIds);
  if (input.is_entry) {
    await supabase
      .from("bot_conversation_trees")
      .update({ root_node_id: data.id })
      .eq("id", treeId);
  }

  await supabase
    .from("bot_conversation_trees")
    .update({
      version: Number(tree?.version ?? 1) + 1,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);

  const media = await nodeMediaMap([String(data.id)]);
  return mapNodeRow(
    data as Record<string, unknown>,
    media.get(String(data.id)) ?? [],
  );
}

export async function updateConversationNode(
  treeId: string,
  nodeId: string,
  input: Partial<{
    name: string;
    stage: string | null;
    content_type: BotContentType;
    body: string;
    interactive_payload: BotInteractivePayload;
    location_payload: BotLocationPayload | null;
    message_code: string | null;
    is_entry: boolean;
    is_active: boolean;
    mediaIds: string[];
    position_x: number;
    position_y: number;
    sort_order: number;
  }>,
  actor: Actor,
): Promise<BotConversationNode> {
  await snapshotTree(treeId, actor, "Editar nodo");
  const supabase = createAdminClient();
  const { data: before, error: beforeError } = await supabase
    .from("bot_conversation_nodes")
    .select("*")
    .eq("id", nodeId)
    .eq("tree_id", treeId)
    .single();
  if (beforeError || !before) throw new Error("Nodo no encontrado");

  const body = input.body ?? String(before.body ?? "");
  const patch: Record<string, unknown> = {
    name: input.name?.trim() ?? before.name,
    stage:
      input.stage !== undefined ? input.stage?.trim() || null : before.stage,
    content_type:
      input.content_type && isBotContentType(input.content_type)
        ? input.content_type
        : before.content_type,
    body,
    available_variables: extractVariablesFromBody(body),
    interactive_payload:
      input.interactive_payload !== undefined
        ? input.interactive_payload
        : before.interactive_payload,
    location_payload:
      input.location_payload !== undefined
        ? input.location_payload
        : before.location_payload,
    message_code:
      input.message_code !== undefined
        ? input.message_code?.trim() || null
        : before.message_code,
    is_entry:
      typeof input.is_entry === "boolean" ? input.is_entry : before.is_entry,
    is_active:
      typeof input.is_active === "boolean" ? input.is_active : before.is_active,
    position_x:
      typeof input.position_x === "number" ? input.position_x : before.position_x,
    position_y:
      typeof input.position_y === "number" ? input.position_y : before.position_y,
    sort_order:
      typeof input.sort_order === "number" ? input.sort_order : before.sort_order,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("bot_conversation_nodes")
    .update(patch)
    .eq("id", nodeId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo actualizar");

  if (input.mediaIds) await setNodeMedia(nodeId, input.mediaIds);

  if (input.is_entry === true) {
    await supabase
      .from("bot_conversation_trees")
      .update({ root_node_id: nodeId })
      .eq("id", treeId);
  }

  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version")
    .eq("id", treeId)
    .single();

  await supabase
    .from("bot_conversation_trees")
    .update({
      version: Number(tree?.version ?? 1) + 1,
      status: "DRAFT",
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);

  const media = await nodeMediaMap([nodeId]);
  return mapNodeRow(data as Record<string, unknown>, media.get(nodeId) ?? []);
}

export async function deleteConversationNode(
  treeId: string,
  nodeId: string,
  actor: Actor,
): Promise<void> {
  await snapshotTree(treeId, actor, "Eliminar nodo");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bot_conversation_nodes")
    .delete()
    .eq("id", nodeId)
    .eq("tree_id", treeId);
  if (error) throw new Error(error.message);

  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version, root_node_id")
    .eq("id", treeId)
    .single();

  await supabase
    .from("bot_conversation_trees")
    .update({
      version: Number(tree?.version ?? 1) + 1,
      status: "DRAFT",
      root_node_id:
        tree?.root_node_id === nodeId ? null : tree?.root_node_id ?? null,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);
}

export async function upsertConversationEdge(
  treeId: string,
  input: {
    id?: string;
    from_node_id: string;
    to_node_id: string;
    label?: string;
    trigger_type?: BotEdgeTriggerType;
    trigger_value?: string;
    sort_order?: number;
  },
  actor: Actor,
): Promise<BotConversationEdge> {
  if (input.from_node_id === input.to_node_id) {
    throw new Error("Una conexión no puede apuntar al mismo nodo");
  }
  await snapshotTree(treeId, actor, "Editar conexión");
  const supabase = createAdminClient();
  const payload = {
    tree_id: treeId,
    from_node_id: input.from_node_id,
    to_node_id: input.to_node_id,
    label: input.label?.trim() || "",
    trigger_type: isBotEdgeTriggerType(input.trigger_type)
      ? input.trigger_type
      : "button",
    trigger_value: input.trigger_value?.trim() || "",
    sort_order: input.sort_order ?? 0,
  };

  let data;
  let error;
  if (input.id) {
    ({ data, error } = await supabase
      .from("bot_conversation_edges")
      .update(payload)
      .eq("id", input.id)
      .eq("tree_id", treeId)
      .select("*")
      .single());
  } else {
    ({ data, error } = await supabase
      .from("bot_conversation_edges")
      .insert(payload)
      .select("*")
      .single());
  }
  if (error || !data) throw new Error(error?.message || "No se pudo guardar conexión");

  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version")
    .eq("id", treeId)
    .single();
  await supabase
    .from("bot_conversation_trees")
    .update({
      version: Number(tree?.version ?? 1) + 1,
      status: "DRAFT",
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);

  return mapEdgeRow(data as Record<string, unknown>);
}

export async function deleteConversationEdge(
  treeId: string,
  edgeId: string,
  actor: Actor,
): Promise<void> {
  await snapshotTree(treeId, actor, "Eliminar conexión");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bot_conversation_edges")
    .delete()
    .eq("id", edgeId)
    .eq("tree_id", treeId);
  if (error) throw new Error(error.message);

  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version")
    .eq("id", treeId)
    .single();
  await supabase
    .from("bot_conversation_trees")
    .update({
      version: Number(tree?.version ?? 1) + 1,
      status: "DRAFT",
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);
}

export async function listConversationTreeVersions(
  treeId: string,
): Promise<BotConversationTreeVersion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_conversation_tree_versions")
    .select("*")
    .eq("tree_id", treeId)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    tree_id: String(row.tree_id),
    version: Number(row.version),
    status: row.status as BotMessageStatus,
    snapshot: row.snapshot as BotConversationTreeDetail,
    change_note: (row.change_note as string | null) ?? null,
    changed_by_email: (row.changed_by_email as string | null) ?? null,
    created_at: String(row.created_at),
  }));
}

export async function restoreConversationTreeVersion(
  treeId: string,
  versionId: string,
  actor: Actor,
): Promise<BotConversationTreeDetail> {
  const versions = await listConversationTreeVersions(treeId);
  const target = versions.find((v) => v.id === versionId);
  if (!target) throw new Error("Versión no encontrada");
  const snap = target.snapshot;
  await snapshotTree(treeId, actor, `Restaurar v${target.version}`);

  const supabase = createAdminClient();
  await supabase.from("bot_conversation_edges").delete().eq("tree_id", treeId);
  await supabase.from("bot_conversation_nodes").delete().eq("tree_id", treeId);

  const idMap = new Map<string, string>();
  for (const node of snap.nodes ?? []) {
    const { data, error } = await supabase
      .from("bot_conversation_nodes")
      .insert({
        tree_id: treeId,
        code: node.code,
        name: node.name,
        stage: node.stage,
        content_type: node.content_type,
        body: node.body,
        available_variables: node.available_variables,
        location_payload: node.location_payload,
        interactive_payload: node.interactive_payload,
        message_code: node.message_code,
        is_entry: node.is_entry,
        is_active: node.is_active,
        sort_order: node.sort_order,
        position_x: node.position_x,
        position_y: node.position_y,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Error restaurando nodo");
    idMap.set(node.id, String(data.id));
    if (node.mediaIds?.length) {
      await setNodeMedia(String(data.id), node.mediaIds);
    }
  }

  for (const edge of snap.edges ?? []) {
    const fromId = idMap.get(edge.from_node_id);
    const toId = idMap.get(edge.to_node_id);
    if (!fromId || !toId) continue;
    await supabase.from("bot_conversation_edges").insert({
      tree_id: treeId,
      from_node_id: fromId,
      to_node_id: toId,
      label: edge.label,
      trigger_type: edge.trigger_type,
      trigger_value: edge.trigger_value,
      sort_order: edge.sort_order,
    });
  }

  const rootId = snap.root_node_id
    ? idMap.get(snap.root_node_id) ?? null
    : null;

  const { data: tree } = await supabase
    .from("bot_conversation_trees")
    .select("version")
    .eq("id", treeId)
    .single();

  await supabase
    .from("bot_conversation_trees")
    .update({
      name: snap.name,
      description: snap.description,
      status: "DRAFT",
      is_active: snap.is_active,
      environment: snap.environment,
      root_node_id: rootId,
      version: Number(tree?.version ?? 1) + 1,
      updated_by_email: actor.email ?? null,
      updated_by_id: actor.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treeId);

  return getConversationTreeDetail(treeId);
}

export async function publishConversationTree(
  treeId: string,
  actor: Actor,
): Promise<BotConversationTreeDetail> {
  return updateConversationTree(treeId, { status: "PUBLISHED" }, actor);
}

/** Solo configuración PUBLISHED + activa — consumo runtime del bot. */
export async function getPublishedConversationTree(
  code: string,
  environment: BotEnvironment = "PRODUCTION",
): Promise<PublishedConversationTree | null> {
  const detail = await getConversationTreeDetail(code.toUpperCase());
  if (detail.status !== "PUBLISHED" || !detail.is_active) return null;
  if (detail.environment !== environment) return null;

  const supabase = createAdminClient();
  const mediaIds = detail.nodes.flatMap((n) => n.mediaIds);
  const urlMap = new Map<string, string>();
  if (mediaIds.length > 0) {
    const { data: media } = await supabase
      .from("bot_media_assets")
      .select("id, public_url, external_url, status")
      .in("id", mediaIds);
    for (const row of media ?? []) {
      if (row.status !== "ACTIVE") continue;
      const url =
        (row.public_url as string | null) ||
        (row.external_url as string | null);
      if (url) urlMap.set(String(row.id), url);
    }
  }

  const root = detail.nodes.find((n) => n.id === detail.root_node_id);
  return {
    code: detail.code,
    name: detail.name,
    audience: detail.audience,
    version: detail.version,
    environment: detail.environment,
    root_node_code: root?.code ?? null,
    nodes: detail.nodes
      .filter((n) => n.is_active)
      .map((n) => ({
        code: n.code,
        name: n.name,
        stage: n.stage,
        content_type: n.content_type,
        body: n.body,
        available_variables: n.available_variables,
        location_payload: n.location_payload,
        interactive_payload: n.interactive_payload,
        message_code: n.message_code,
        is_entry: n.is_entry,
        media_urls: n.mediaIds
          .map((id) => urlMap.get(id))
          .filter((u): u is string => Boolean(u)),
      })),
    edges: detail.edges.map((e) => {
      const from = detail.nodes.find((n) => n.id === e.from_node_id);
      const to = detail.nodes.find((n) => n.id === e.to_node_id);
      return {
        from_code: from?.code ?? "",
        to_code: to?.code ?? "",
        label: e.label,
        trigger_type: e.trigger_type,
        trigger_value: e.trigger_value,
        sort_order: e.sort_order,
      };
    }),
  };
}

export async function getPublishedMessageByCode(code: string): Promise<{
  code: string;
  body: string;
  content_type: string;
  interactive_payload: BotInteractivePayload;
  location_payload: BotLocationPayload | null;
  available_variables: string[];
  version: number;
} | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_messages")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("status", "PUBLISHED")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    code: String(data.code),
    body: String(data.body ?? ""),
    content_type: String(data.content_type ?? "text"),
    interactive_payload: normalizeInteractivePayload(data.interactive_payload),
    location_payload: normalizeLocationPayload(data.location_payload),
    available_variables: Array.isArray(data.available_variables)
      ? (data.available_variables as string[])
      : [],
    version: Number(data.version ?? 1),
  };
}

export async function listPublishedConversationTrees(
  audience?: BotAudience,
  environment: BotEnvironment = "PRODUCTION",
): Promise<PublishedConversationTree[]> {
  const trees = await listConversationTrees({
    audience,
    status: "PUBLISHED",
  });
  const result: PublishedConversationTree[] = [];
  for (const tree of trees.filter((t) => t.is_active && t.environment === environment)) {
    const published = await getPublishedConversationTree(tree.code, environment);
    if (published) result.push(published);
  }
  return result;
}
