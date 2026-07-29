/** Tipos REF-002 — referidos de conductores (consumo de REF-001). */

export type ReferralListSort =
  | "registered_desc"
  | "registered_asc"
  | "name_asc"
  | "name_desc"
  | "status_asc";

export type DriverReferralLink = {
  code: string;
  inviteUrl: string;
  createdAt: string | null;
  createdAtLabel: string;
};

export type DriverReferralStats = {
  invited: number;
  registered: number;
  beta: number;
  active: number;
  firstServiceCompleted: number;
};

export type DriverReferralListItem = {
  id: string;
  name: string;
  registeredAt: string | null;
  registeredAtLabel: string;
  status: string;
  statusLabel: string;
  hasFirstService: boolean;
  firstServiceLabel: "Sí" | "No";
};

export type DriverReferralsSnapshot = {
  available: boolean;
  unavailableReason: string | null;
  link: DriverReferralLink | null;
  stats: DriverReferralStats;
  items: DriverReferralListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  sort: ReferralListSort;
};

export type DriverReferralsResponse =
  | { ok: true; data: DriverReferralsSnapshot }
  | { ok: false; error: string };

export type ReferralRankingItem = {
  driverId: string;
  driverName: string;
  invited: number;
  registered: number;
  active: number;
};

export type ReferralsDashboardBlock = {
  available: boolean;
  unavailableReason: string | null;
  totalReferredUsers: number;
  driversWithReferrals: number;
  conversionInvitedToRegistered: number;
  conversionRegisteredToActive: number;
  conversionInvitedToRegisteredLabel: string;
  conversionRegisteredToActiveLabel: string;
  topDrivers: ReferralRankingItem[];
};

export function emptyReferralStats(): DriverReferralStats {
  return {
    invited: 0,
    registered: 0,
    beta: 0,
    active: 0,
    firstServiceCompleted: 0,
  };
}

export function emptyReferralsDashboard(): ReferralsDashboardBlock {
  return {
    available: false,
    unavailableReason: null,
    totalReferredUsers: 0,
    driversWithReferrals: 0,
    conversionInvitedToRegistered: 0,
    conversionRegisteredToActive: 0,
    conversionInvitedToRegisteredLabel: "—",
    conversionRegisteredToActiveLabel: "—",
    topDrivers: [],
  };
}
