import type { ReferralsDashboardBlock } from "@/lib/referrals/types";

export type TripStatus =
  | "SEARCHING"
  | "ASSIGNED"
  | "ETA_INFORMED"
  | "DRIVER_ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "cancelled_no_driver"
  | string;

export type HealthStatus = "ok" | "degraded" | "error" | "unknown";

export type DashboardRecentTrip = {
  id: string;
  shortId: string;
  status: TripStatus;
  statusLabel: string;
  driverName: string | null;
  origin: string;
  destination: string;
  createdAt: string;
  timeLabel: string;
};

export type DashboardSnapshot = {
  fetchedAt: string;
  fetchedAtLabel: string;
  timezone: string;
  counts: {
    createdToday: number;
    active: number;
    completedToday: number;
    cancelledToday: number;
    driversActive: number;
    driversAvailable: number;
  };
  recentTrips: DashboardRecentTrip[];
  system: {
    supabase: {
      status: HealthStatus;
      detail: string;
    };
    bot: {
      status: HealthStatus;
      detail: string;
    };
    lastSyncLabel: string;
    lastActivityAt: string | null;
    lastActivityLabel: string;
  };
  referrals: ReferralsDashboardBlock;
};

export type DashboardResponse =
  | { ok: true; data: DashboardSnapshot }
  | { ok: false; error: string };
