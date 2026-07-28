export const BOT_MESSAGE_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type BotMessageStatus = (typeof BOT_MESSAGE_STATUSES)[number];

export const BOT_MEDIA_TYPES = [
  "sticker",
  "image",
  "gif",
  "video",
  "audio",
  "pdf",
] as const;
export type BotMediaType = (typeof BOT_MEDIA_TYPES)[number];

export const BOT_MEDIA_TYPE_LABELS: Record<BotMediaType, string> = {
  sticker: "Stickers",
  image: "Imágenes",
  gif: "GIF",
  video: "Videos",
  audio: "Audios",
  pdf: "PDF",
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
  changed_by_email: string | null;
  change_note: string | null;
  created_at: string;
};

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
