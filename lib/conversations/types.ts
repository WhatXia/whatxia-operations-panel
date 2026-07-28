import type { TripStatus } from "@/lib/dashboard/types";

export type ConversationRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "all";

export type ConversationSort = "newest" | "oldest" | "activity";

export type ConversationListFilters = {
  preset: ConversationRangePreset;
  status: string;
  driver: string;
  passenger: string;
  phone: string;
  tripId: string;
  query: string;
  sort: ConversationSort;
};

export type ConversationListItem = {
  id: string;
  shortId: string;
  dateLabel: string;
  timeLabel: string;
  passengerName: string;
  passengerPhone: string | null;
  serviceStatus: TripStatus;
  serviceStatusLabel: string;
  conversationStatus: string;
  conversationStatusAvailable: boolean;
  driverName: string | null;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  elapsedLabel: string;
  createdAt: string;
};

export type ConversationListSnapshot = {
  generatedAt: string;
  timezone: string;
  items: ConversationListItem[];
  total: number;
  gaps: Array<{ id: string; label: string; reason: string }>;
};

export type ChatMessageOrigin = "passenger" | "driver" | "bot" | "system";

export type ChatMessageView = {
  id: string;
  origin: ChatMessageOrigin;
  originLabel: string;
  content: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  timeLabel: string;
  dateLabel: string;
  available: boolean;
  note?: string | null;
};

export type TimelineEventView = {
  id: string;
  at: string;
  timeLabel: string;
  title: string;
  detail: string | null;
  source: "trip" | "tunnel" | "message" | "cancellation" | "session" | "gap";
};

export type SidePanelField = {
  label: string;
  value: string;
  available: boolean;
};

export type ConversationAuditItem = {
  id: string;
  createdAt: string;
  dateLabel: string;
  timeLabel: string;
  userEmail: string | null;
  action: string;
  result: string;
  message: string | null;
};

export type ConversationDetail = {
  id: string;
  shortId: string;
  generatedAt: string;
  timezone: string;
  list: ConversationListItem;
  messages: ChatMessageView[];
  timeline: TimelineEventView[];
  sidePanel: {
    passenger: SidePanelField[];
    driver: SidePanelField[];
    service: SidePanelField[];
  };
  audit: ConversationAuditItem[];
  gaps: Array<{
    id: string;
    label: string;
    reason: string;
    futureNeed: string;
  }>;
  exportReady: boolean;
  exportBlockers: string[];
};

export type ConversationsListResponse =
  | { ok: true; data: ConversationListSnapshot }
  | { ok: false; error: string };

export type ConversationDetailResponse =
  | { ok: true; data: ConversationDetail }
  | { ok: false; error: string };
