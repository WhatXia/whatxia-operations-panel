import {
  BOT_CONTENT_TYPES,
  BOT_ENVIRONMENTS,
  emptyInteractivePayload,
  normalizeInteractivePayload,
  normalizeLocationPayload,
  type BotContentType,
  type BotEnvironment,
  type BotInteractivePayload,
  type BotLocationPayload,
  type BotMessageStatus,
} from "@/lib/bot-cms/types";

export const BOT_AUDIENCES = ["PASSENGER", "DRIVER"] as const;
export type BotAudience = (typeof BOT_AUDIENCES)[number];

export const BOT_AUDIENCE_LABELS: Record<BotAudience, string> = {
  PASSENGER: "Usuarios",
  DRIVER: "Conductores",
};

export const PASSENGER_STAGES = [
  "ONBOARDING",
  "MOVILIDAD",
  "PIONEROS",
  "SOPORTE",
  "OTRO",
] as const;

export const DRIVER_STAGES = [
  "REGISTRO",
  "ACTIVACION",
  "OFERTAS",
  "VIAJES",
  "INCIDENCIAS",
  "SUSPENSIONES",
  "FINALIZACION",
  "OTRO",
] as const;

export const BOT_EDGE_TRIGGER_TYPES = [
  "button",
  "list",
  "option",
  "text",
  "default",
  "variable",
] as const;
export type BotEdgeTriggerType = (typeof BOT_EDGE_TRIGGER_TYPES)[number];

export type BotConversationTreeListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: BotAudience;
  status: BotMessageStatus;
  version: number;
  is_active: boolean;
  environment: BotEnvironment;
  root_node_id: string | null;
  nodeCount: number;
  edgeCount: number;
  updated_at: string;
  updated_by_email: string | null;
};

export type BotConversationNode = {
  id: string;
  tree_id: string;
  code: string;
  name: string;
  stage: string | null;
  content_type: BotContentType;
  body: string;
  available_variables: string[];
  location_payload: BotLocationPayload | null;
  interactive_payload: BotInteractivePayload;
  message_code: string | null;
  is_entry: boolean;
  is_active: boolean;
  sort_order: number;
  position_x: number;
  position_y: number;
  mediaIds: string[];
  created_at: string;
  updated_at: string;
};

export type BotConversationEdge = {
  id: string;
  tree_id: string;
  from_node_id: string;
  to_node_id: string;
  label: string;
  trigger_type: BotEdgeTriggerType;
  trigger_value: string;
  sort_order: number;
};

export type BotConversationTreeDetail = BotConversationTreeListItem & {
  nodes: BotConversationNode[];
  edges: BotConversationEdge[];
};

export type BotConversationTreeVersion = {
  id: string;
  tree_id: string;
  version: number;
  status: BotMessageStatus;
  snapshot: BotConversationTreeDetail;
  change_note: string | null;
  changed_by_email: string | null;
  created_at: string;
};

export type PublishedConversationNode = {
  code: string;
  name: string;
  stage: string | null;
  content_type: BotContentType;
  body: string;
  available_variables: string[];
  location_payload: BotLocationPayload | null;
  interactive_payload: BotInteractivePayload;
  message_code: string | null;
  is_entry: boolean;
  media_urls: string[];
};

export type PublishedConversationEdge = {
  from_code: string;
  to_code: string;
  label: string;
  trigger_type: BotEdgeTriggerType;
  trigger_value: string;
  sort_order: number;
};

export type PublishedConversationTree = {
  code: string;
  name: string;
  audience: BotAudience;
  version: number;
  environment: BotEnvironment;
  root_node_code: string | null;
  nodes: PublishedConversationNode[];
  edges: PublishedConversationEdge[];
};

export function isBotAudience(value: unknown): value is BotAudience {
  return (
    typeof value === "string" &&
    (BOT_AUDIENCES as readonly string[]).includes(value)
  );
}

export function isBotEdgeTriggerType(
  value: unknown,
): value is BotEdgeTriggerType {
  return (
    typeof value === "string" &&
    (BOT_EDGE_TRIGGER_TYPES as readonly string[]).includes(value)
  );
}

export function stagesForAudience(audience: BotAudience): readonly string[] {
  return audience === "DRIVER" ? DRIVER_STAGES : PASSENGER_STAGES;
}

export function mapNodeRow(
  row: Record<string, unknown>,
  mediaIds: string[] = [],
): BotConversationNode {
  const contentType = row.content_type;
  return {
    id: String(row.id),
    tree_id: String(row.tree_id),
    code: String(row.code),
    name: String(row.name),
    stage: (row.stage as string | null) ?? null,
    content_type:
      typeof contentType === "string" &&
      (BOT_CONTENT_TYPES as readonly string[]).includes(contentType)
        ? (contentType as BotContentType)
        : "text",
    body: String(row.body ?? ""),
    available_variables: Array.isArray(row.available_variables)
      ? (row.available_variables as string[])
      : [],
    location_payload: normalizeLocationPayload(row.location_payload),
    interactive_payload: normalizeInteractivePayload(row.interactive_payload),
    message_code: (row.message_code as string | null) ?? null,
    is_entry: Boolean(row.is_entry),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    position_x: Number(row.position_x ?? 0),
    position_y: Number(row.position_y ?? 0),
    mediaIds,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapEdgeRow(row: Record<string, unknown>): BotConversationEdge {
  return {
    id: String(row.id),
    tree_id: String(row.tree_id),
    from_node_id: String(row.from_node_id),
    to_node_id: String(row.to_node_id),
    label: String(row.label ?? ""),
    trigger_type: isBotEdgeTriggerType(row.trigger_type)
      ? row.trigger_type
      : "button",
    trigger_value: String(row.trigger_value ?? ""),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function emptyNodeInteractive() {
  return emptyInteractivePayload("buttons");
}

export function isBotEnvironmentSafe(value: unknown): value is BotEnvironment {
  return (
    typeof value === "string" &&
    (BOT_ENVIRONMENTS as readonly string[]).includes(value)
  );
}
