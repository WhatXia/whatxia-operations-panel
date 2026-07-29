import type {
  PassengerDetail,
  PassengerListItem,
  PassengerStatus,
} from "@/lib/passengers/types";

export type PassengersSnapshot = {
  passengers: PassengerListItem[];
  total: number;
  counts: Record<PassengerStatus | "all", number>;
  fetchedAt: string;
  fetchedAtLabel: string;
  timezone: string;
};

export type PassengersResponse =
  | { ok: true; data: PassengersSnapshot }
  | { ok: false; error: string };

export type PassengerDetailResponse =
  | { ok: true; data: PassengerDetail }
  | { ok: false; error: string };

export type PassengerStatusUpdateResponse =
  | { ok: true; data: PassengerDetail }
  | { ok: false; error: string };
