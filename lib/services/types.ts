import type { TripStatus } from "@/lib/dashboard/types";

export type ServiceFilter =
  | "all"
  | "requested"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ServiceSort = "newest" | "oldest";

export type ServiceRow = {
  id: string;
  shortId: string;
  status: TripStatus;
  statusLabel: string;
  passengerName: string;
  driverName: string | null;
  origin: string;
  destination: string;
  fareLabel: string;
  fareValue: number | null;
  currency: string;
  createdAt: string;
  timeLabel: string;
  elapsedLabel: string;
  updatedAt: string | null;
};

export type ServicesSnapshot = {
  fetchedAt: string;
  fetchedAtLabel: string;
  timezone: string;
  filter: ServiceFilter;
  sort: ServiceSort;
  query: string;
  total: number;
  services: ServiceRow[];
};

export type ServicesResponse =
  | { ok: true; data: ServicesSnapshot }
  | { ok: false; error: string };
