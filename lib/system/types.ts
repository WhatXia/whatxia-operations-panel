export type ComponentHealth = "ok" | "warning" | "error" | "unknown";

export type SystemComponent = {
  id: string;
  label: string;
  status: ComponentHealth;
  statusLabel: string;
  detail: string;
};

export type SystemEventSeverity = "info" | "warning" | "error" | "success";

export type SystemEvent = {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: SystemEventSeverity;
  at: string;
  timeLabel: string;
};

export type SystemTechInfo = {
  lastSyncAt: string;
  lastSyncLabel: string;
  serverTimeAt: string;
  serverTimeLabel: string;
  opsVersion: string;
  botVersion: string;
  sinceLastUpdateLabel: string;
  timezone: string;
};

export type SystemIndicators = {
  servicesToday: number;
  driversActive: number;
  authenticatedUsers: number;
  activeConnections: number;
};

export type SystemStatusSnapshot = {
  fetchedAt: string;
  fetchedAtLabel: string;
  overall: ComponentHealth;
  overallLabel: string;
  components: SystemComponent[];
  events: SystemEvent[];
  tech: SystemTechInfo;
  indicators: SystemIndicators;
};

export type SystemStatusResponse =
  | { ok: true; data: SystemStatusSnapshot }
  | { ok: false; error: string };
