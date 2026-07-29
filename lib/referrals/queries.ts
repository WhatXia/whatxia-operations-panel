import { createAdminClient } from "@/lib/supabase/admin";
import { driverDisplayName } from "@/lib/drivers/format";
import { displayPassengerName } from "@/lib/passengers/format";
import {
  computeReferralStats,
  conversionRate,
  filterReferralItems,
  formatConversionPercent,
  isMissingRelationError,
  paginateItems,
  rankDriversByRegistered,
  sortReferralItems,
} from "@/lib/referrals/compute";
import {
  formatReferralDate,
  referralStatusLabel,
  resolveInviteUrl,
} from "@/lib/referrals/format";
import type {
  DriverReferralListItem,
  DriverReferralsSnapshot,
  ReferralListSort,
  ReferralsDashboardBlock,
} from "@/lib/referrals/types";
import { emptyReferralStats, emptyReferralsDashboard } from "@/lib/referrals/types";

type LinkRow = {
  driver_id: string;
  code: string;
  invite_url: string;
  created_at: string;
};

type ReferralRow = {
  id: string;
  driver_id: string;
  referral_code: string;
  invitee_phone: string | null;
  invitee_name: string | null;
  passenger_id: string | null;
  invited_at: string;
  registered_at: string | null;
};

type PassengerLite = {
  id: string;
  phone: string | null;
  name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  whatsapp_name: string | null;
  status: string | null;
  registered_at: string | null;
  created_at: string | null;
};

type DriverLite = {
  id: string;
  name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  phone: string | null;
};

const REFERRAL_SORTS = new Set<ReferralListSort>([
  "registered_desc",
  "registered_asc",
  "name_asc",
  "name_desc",
  "status_asc",
]);

export function parseReferralSort(value: string | null): ReferralListSort {
  if (value && REFERRAL_SORTS.has(value as ReferralListSort)) {
    return value as ReferralListSort;
  }
  return "registered_desc";
}

async function loadPassengersByIds(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, PassengerLite>> {
  const map = new Map<string, PassengerLite>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("passengers")
    .select(
      "id, phone, name, full_name, preferred_name, whatsapp_name, status, registered_at, created_at",
    )
    .in("id", ids);
  for (const row of (data ?? []) as PassengerLite[]) {
    map.set(row.id, row);
  }
  return map;
}

async function loadFirstCompletedSet(
  supabase: ReturnType<typeof createAdminClient>,
  passengerIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (passengerIds.length === 0) return set;
  const { data } = await supabase
    .from("trips")
    .select("passenger_id, status")
    .in("passenger_id", passengerIds)
    .eq("status", "COMPLETED");
  for (const row of (data ?? []) as Array<{ passenger_id: string | null }>) {
    if (row.passenger_id) set.add(row.passenger_id);
  }
  return set;
}

function toListItem(
  row: ReferralRow,
  passenger: PassengerLite | null,
  hasFirstService: boolean,
): DriverReferralListItem {
  const status = passenger?.status?.trim() || "INVITED";
  const name = passenger
    ? displayPassengerName(passenger)
    : row.invitee_name?.trim() ||
      row.invitee_phone?.trim() ||
      "Invitado sin nombre";
  const registeredAt =
    row.registered_at ||
    passenger?.registered_at ||
    passenger?.created_at ||
    null;

  return {
    id: row.id,
    name,
    registeredAt,
    registeredAtLabel: registeredAt
      ? formatReferralDate(registeredAt)
      : formatReferralDate(row.invited_at),
    status,
    statusLabel: referralStatusLabel(status),
    hasFirstService,
    firstServiceLabel: hasFirstService ? "Sí" : "No",
  };
}

export async function fetchDriverReferralsSnapshot(
  driverId: string,
  options?: {
    query?: string;
    sort?: ReferralListSort;
    page?: number;
    pageSize?: number;
  },
): Promise<DriverReferralsSnapshot> {
  const supabase = createAdminClient();
  const query = options?.query?.trim() ?? "";
  const sort = options?.sort ?? "registered_desc";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;

  const linkRes = await supabase
    .from("driver_referral_links")
    .select("driver_id, code, invite_url, created_at")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (linkRes.error && isMissingRelationError(linkRes.error)) {
    return {
      available: false,
      unavailableReason:
        "Esquema de referidos no aplicado (REF-001 / migración 007).",
      link: null,
      stats: emptyReferralStats(),
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      query,
      sort,
    };
  }

  if (linkRes.error) {
    throw new Error(linkRes.error.message || "Error al leer enlace de referido");
  }

  const referralsRes = await supabase
    .from("driver_referrals")
    .select(
      "id, driver_id, referral_code, invitee_phone, invitee_name, passenger_id, invited_at, registered_at",
    )
    .eq("driver_id", driverId)
    .order("invited_at", { ascending: false });

  if (referralsRes.error && isMissingRelationError(referralsRes.error)) {
    return {
      available: false,
      unavailableReason:
        "Esquema de referidos no aplicado (REF-001 / migración 007).",
      link: null,
      stats: emptyReferralStats(),
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      query,
      sort,
    };
  }

  if (referralsRes.error) {
    throw new Error(
      referralsRes.error.message || "Error al listar referidos",
    );
  }

  const linkRow = (linkRes.data as LinkRow | null) ?? null;
  const referrals = (referralsRes.data ?? []) as ReferralRow[];
  const passengerIds = referrals
    .map((r) => r.passenger_id)
    .filter((id): id is string => Boolean(id));

  const [passengers, firstCompleted] = await Promise.all([
    loadPassengersByIds(supabase, passengerIds),
    loadFirstCompletedSet(supabase, passengerIds),
  ]);

  let beta = 0;
  let active = 0;
  let firstServiceCompleted = 0;
  const registered = passengerIds.length;

  for (const id of passengerIds) {
    const passenger = passengers.get(id);
    const status = passenger?.status ?? "";
    if (status === "BETA") beta += 1;
    if (status === "ACTIVE") active += 1;
    if (firstCompleted.has(id)) firstServiceCompleted += 1;
  }

  const allItems = referrals.map((row) => {
    const passenger = row.passenger_id
      ? passengers.get(row.passenger_id) ?? null
      : null;
    const hasFirst = row.passenger_id
      ? firstCompleted.has(row.passenger_id)
      : false;
    return toListItem(row, passenger, hasFirst);
  });

  const filtered = filterReferralItems(allItems, query);
  const sorted = sortReferralItems(filtered, sort);
  const pageResult = paginateItems(sorted, page, pageSize);

  return {
    available: true,
    unavailableReason: null,
    link: linkRow
      ? {
          code: linkRow.code,
          inviteUrl: resolveInviteUrl(linkRow.invite_url, linkRow.code),
          createdAt: linkRow.created_at,
          createdAtLabel: formatReferralDate(linkRow.created_at),
        }
      : null,
    stats: computeReferralStats({
      invited: referrals.length,
      registered,
      beta,
      active,
      firstServiceCompleted,
    }),
    items: pageResult.items,
    total: pageResult.total,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
    totalPages: pageResult.totalPages,
    query,
    sort,
  };
}

export async function fetchReferralsDashboardBlock(): Promise<ReferralsDashboardBlock> {
  const supabase = createAdminClient();

  const linksRes = await supabase
    .from("driver_referral_links")
    .select("driver_id, code");

  if (linksRes.error && isMissingRelationError(linksRes.error)) {
    return {
      ...emptyReferralsDashboard(),
      unavailableReason:
        "Esquema de referidos no aplicado (REF-001 / migración 007).",
    };
  }

  if (linksRes.error) {
    throw new Error(linksRes.error.message || "Error al leer referidos");
  }

  const referralsRes = await supabase
    .from("driver_referrals")
    .select("id, driver_id, passenger_id");

  if (referralsRes.error && isMissingRelationError(referralsRes.error)) {
    return {
      ...emptyReferralsDashboard(),
      unavailableReason:
        "Esquema de referidos no aplicado (REF-001 / migración 007).",
    };
  }

  if (referralsRes.error) {
    throw new Error(referralsRes.error.message || "Error al agregar referidos");
  }

  const referrals = (referralsRes.data ?? []) as Array<{
    id: string;
    driver_id: string;
    passenger_id: string | null;
  }>;

  const passengerIds = Array.from(
    new Set(
      referrals
        .map((r) => r.passenger_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const passengers = await loadPassengersByIds(supabase, passengerIds);
  const driverIds = Array.from(new Set(referrals.map((r) => r.driver_id)));

  const driversRes =
    driverIds.length > 0
      ? await supabase
          .from("drivers")
          .select("id, name, full_name, preferred_name, phone")
          .in("id", driverIds)
      : { data: [] as DriverLite[], error: null };

  const drivers = new Map<string, DriverLite>();
  for (const row of (driversRes.data ?? []) as DriverLite[]) {
    drivers.set(row.id, row);
  }

  const byDriver = new Map<
    string,
    { invited: number; registered: number; active: number }
  >();

  for (const row of referrals) {
    const bucket = byDriver.get(row.driver_id) ?? {
      invited: 0,
      registered: 0,
      active: 0,
    };
    bucket.invited += 1;
    if (row.passenger_id) {
      bucket.registered += 1;
      if (passengers.get(row.passenger_id)?.status === "ACTIVE") {
        bucket.active += 1;
      }
    }
    byDriver.set(row.driver_id, bucket);
  }

  const invitedTotal = referrals.length;
  const registeredTotal = passengerIds.length;
  let activeTotal = 0;
  for (const id of passengerIds) {
    if (passengers.get(id)?.status === "ACTIVE") activeTotal += 1;
  }

  const invitedToRegistered = conversionRate(registeredTotal, invitedTotal);
  const registeredToActive = conversionRate(activeTotal, registeredTotal);

  const rankingInput = Array.from(byDriver.entries()).map(
    ([driverId, stats]) => {
      const driver = drivers.get(driverId);
      return {
        driverId,
        driverName: driver
          ? driverDisplayName(driver)
          : `Conductor ${driverId.slice(0, 8)}`,
        invited: stats.invited,
        registered: stats.registered,
        active: stats.active,
      };
    },
  );

  return {
    available: true,
    unavailableReason: null,
    totalReferredUsers: registeredTotal,
    driversWithReferrals: byDriver.size,
    conversionInvitedToRegistered: invitedToRegistered ?? 0,
    conversionRegisteredToActive: registeredToActive ?? 0,
    conversionInvitedToRegisteredLabel: formatConversionPercent(
      invitedToRegistered,
    ),
    conversionRegisteredToActiveLabel: formatConversionPercent(
      registeredToActive,
    ),
    topDrivers: rankDriversByRegistered(rankingInput, 10),
  };
}
