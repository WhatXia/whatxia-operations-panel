export const BOT_MESSAGE_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type BotMessageStatus = (typeof BOT_MESSAGE_STATUSES)[number];

export const BOT_ENVIRONMENTS = ["PRODUCTION", "TEST"] as const;
export type BotEnvironment = (typeof BOT_ENVIRONMENTS)[number];

export const BOT_ENVIRONMENT_LABELS: Record<BotEnvironment, string> = {
  PRODUCTION: "Producción",
  TEST: "Pruebas",
};

export const BOT_CONTENT_TYPES = [
  "text",
  "image",
  "sticker",
  "audio",
  "video",
  "document",
  "location",
  "interactive",
] as const;
export type BotContentType = (typeof BOT_CONTENT_TYPES)[number];

export const BOT_CONTENT_TYPE_LABELS: Record<BotContentType, string> = {
  text: "Texto / Emoji",
  image: "Imagen",
  sticker: "Sticker",
  audio: "Audio",
  video: "Video",
  document: "Documento",
  location: "Ubicación",
  interactive: "Interactivo (botones/listas)",
};

export const BOT_MESSAGE_MODULES = [
  "ONBOARDING",
  "MOVILIDAD",
  "CONDUCTOR",
  "PIONEROS",
  "REFERIDOS",
  "SOPORTE",
  "SISTEMA",
  "OTRO",
] as const;

export type BotMessageModule = (typeof BOT_MESSAGE_MODULES)[number] | string;

export const BOT_MEDIA_TYPES = [
  "sticker",
  "image",
  "gif",
  "video",
  "audio",
  "pdf",
  "document",
] as const;
export type BotMediaType = (typeof BOT_MEDIA_TYPES)[number];

export const BOT_MEDIA_TYPE_LABELS: Record<BotMediaType, string> = {
  sticker: "Stickers",
  image: "Imágenes",
  gif: "GIF",
  video: "Videos",
  audio: "Audios",
  pdf: "PDF",
  document: "Documentos",
};

export const BOT_VARIABLE_CATALOG = [
  { key: "nombre", label: "Nombre", sample: "Ana" },
  { key: "origen", label: "Origen", sample: "Centro" },
  { key: "destino", label: "Destino", sample: "Universidad" },
  { key: "tarifa", label: "Tarifa", sample: "$8.500" },
  { key: "conductor", label: "Conductor", sample: "Carlos" },
  { key: "placa", label: "Placa", sample: "ABC123" },
  { key: "tiempo_llegada", label: "Tiempo de llegada", sample: "5 min" },
] as const;

export type BotVariableKey = (typeof BOT_VARIABLE_CATALOG)[number]["key"];

export type WaInteractiveKind = "buttons" | "list" | "options";

export type WaButtonItem = {
  id: string;
  title: string;
  sort_order: number;
};

export type WaListRow = {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
};

export type WaListSection = {
  title: string;
  rows: WaListRow[];
};

export type BotInteractivePayload = {
  kind: WaInteractiveKind;
  header?: string;
  footer?: string;
  /** Reply buttons (máx. 3 en WhatsApp) */
  buttons?: WaButtonItem[];
  /** Texto del botón que abre la lista */
  listButtonText?: string;
  sections?: WaListSection[];
  /** Opciones simples (alias de botones / filas) */
  options?: WaButtonItem[];
};

export type BotLocationPayload = {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
};

export type BotCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BotMediaAsset = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  media_type: BotMediaType;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  public_url: string | null;
  external_url: string | null;
  tags: string[];
  status: "ACTIVE" | "INACTIVE";
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  previewUrl: string | null;
};

export type BotMessageListItem = {
  id: string;
  code: string;
  name: string;
  body: string;
  status: BotMessageStatus;
  version: number;
  is_active: boolean;
  category_id: string | null;
  categoryName: string | null;
  content_type: BotContentType;
  module: string | null;
  environment: BotEnvironment;
  available_variables: string[];
  mediaCount: number;
  updated_at: string;
  updated_by_email: string | null;
  created_at: string;
  created_by_email: string | null;
};

export type BotMessageDetail = BotMessageListItem & {
  mediaIds: string[];
  media: BotMediaAsset[];
  location_payload: BotLocationPayload | null;
  interactive_payload: BotInteractivePayload;
  previewHtml: string;
};

export type BotMessageVersion = {
  id: string;
  message_id: string;
  version: number;
  body: string;
  name: string;
  status: BotMessageStatus;
  available_variables: string[];
  media_ids: string[];
  category_id: string | null;
  is_active: boolean;
  content_type: BotContentType | null;
  module: string | null;
  environment: BotEnvironment | null;
  location_payload: BotLocationPayload | null;
  interactive_payload: BotInteractivePayload | null;
  changed_by_email: string | null;
  change_note: string | null;
  created_at: string;
};

export function emptyInteractivePayload(
  kind: WaInteractiveKind = "buttons",
): BotInteractivePayload {
  return {
    kind,
    header: "",
    footer: "",
    buttons: [],
    listButtonText: "Ver opciones",
    sections: [{ title: "Opciones", rows: [] }],
    options: [],
  };
}

export function normalizeInteractivePayload(
  raw: unknown,
): BotInteractivePayload {
  if (!raw || typeof raw !== "object") return emptyInteractivePayload();
  const obj = raw as Record<string, unknown>;
  const kind =
    obj.kind === "list" || obj.kind === "options" || obj.kind === "buttons"
      ? obj.kind
      : "buttons";
  const base = emptyInteractivePayload(kind);
  return {
    ...base,
    header: typeof obj.header === "string" ? obj.header : "",
    footer: typeof obj.footer === "string" ? obj.footer : "",
    buttons: Array.isArray(obj.buttons)
      ? (obj.buttons as WaButtonItem[])
      : [],
    listButtonText:
      typeof obj.listButtonText === "string"
        ? obj.listButtonText
        : "Ver opciones",
    sections: Array.isArray(obj.sections)
      ? (obj.sections as WaListSection[])
      : base.sections,
    options: Array.isArray(obj.options)
      ? (obj.options as WaButtonItem[])
      : [],
  };
}

export function normalizeLocationPayload(
  raw: unknown,
): BotLocationPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const latitude = Number(obj.latitude);
  const longitude = Number(obj.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    name: typeof obj.name === "string" ? obj.name : undefined,
    address: typeof obj.address === "string" ? obj.address : undefined,
  };
}

export function extractVariablesFromBody(body: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function previewMessageBody(
  body: string,
  samples?: Record<string, string>,
): string {
  const map = Object.fromEntries(
    BOT_VARIABLE_CATALOG.map((item) => [item.key, item.sample]),
  );
  const merged = { ...map, ...(samples ?? {}) };
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return merged[key] ?? `{{${key}}}`;
  });
}

export function isValidMessageCode(code: string): boolean {
  return /^[A-Z][A-Z0-9_]{1,63}$/.test(code);
}

export function isBotContentType(value: unknown): value is BotContentType {
  return (
    typeof value === "string" &&
    (BOT_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

export function isBotEnvironment(value: unknown): value is BotEnvironment {
  return (
    typeof value === "string" &&
    (BOT_ENVIRONMENTS as readonly string[]).includes(value)
  );
}
