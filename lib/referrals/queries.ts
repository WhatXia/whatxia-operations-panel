import { createAdminClient } from "@/lib/supabase/admin";
import { driverDisplayName } from "@/lib/drivers/format";
import { displayPassengerName } from "@/lib/passengers/format";
import {
  computeReferralStats,
  conversionRate,
  countInvitedPersons,
  filterReferralItems,
  formatConversionPercent,
  isMissingRelationError,
  paginateItems,
  rankDriversByRegistered,
  sortReferralItems,
} from "@/lib/referrals/compute";
import {
  buildReferralInviteUrl,
  formatReferralDate,
  normalizeReferralCode,
  referralStatusLabel,
} from "@/lib/referrals/format";
import type {
  DriverReferralListItem,
  DriverReferralsSnapshot,
  ReferralListSort,
  ReferralsDashboardBlock,
} from "@/lib/referrals/types";
import { emptyReferralStats, emptyReferralsDashboard } from "@/lib/referrals/types";

type DriverRow = {
  id: string;
  referral_code: string | null;
  name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  created_at: string | null;
};

type AttributionRow = {
  id: string;
  referrer_driver_id: string;
  passenger_id: string;
  referral_code: string;
  created_at: string;
};

type EventRow = {
  id: string;
  event_type: string;
  referral_code: string;
  referrer_driver_id: string | null;
  passenger_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
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

function toListItem(
  attr: AttributionRow,
  passenger: PassengerLite | null,
  hasFirstService: boolean,
): DriverReferralListItem {
  const status = passenger?.status?.trim() || "ACTIVE";
  const registeredAt =
    passenger?.registered_at || passenger?.created_at || attr.created_at;

  return {
    id: attr.id,
    name: passenger
      ? displayPassengerName(passenger)
      : `Pasajero ${attr.passenger_id.slice(0, 8)}`,
    registeredAt,
    registeredAtLabel: formatReferralDate(registeredAt),
    status,
    statusLabel: referralStatusLabel(status),
    hasFirstService,
    firstServiceLabel: hasFirstService ? "Sí" : "No",
  };
}

function unavailableSnapshot(
  reason: string,
  query: string,
  sort: ReferralListSort,
  pageSize: number,
): DriverReferralsSnapshot {
  return {
    available: false,
    unavailableReason: reason,
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

  const driverRes = await supabase
    .from("drivers")
    .select("id, referral_code, name, full_name, preferred_name, phone, created_at")
    .eq("id", driverId)
    .maybeSingle();

  if (driverRes.error) {
    if (isMissingRelationError(driverRes.error)) {
      return unavailableSnapshot(
        "No se pudo leer drivers (esquema incompleto).",
        query,
        sort,
        pageSize,
      );
    }
    throw new Error(driverRes.error.message || "Error al leer conductor");
  }

  if (!driverRes.data) {
    throw new Error("Conductor no encontrado");
  }

  const driver = driverRes.data as DriverRow;
  const code = driver.referral_code
    ? normalizeReferralCode(driver.referral_code)
    : null;

  const [eventsRes, attrsRes] = await Promise.all([
    supabase
      .from("referral_events")
      .select(
        "id, event_type, referral_code, referrer_driver_id, passenger_id, meta, created_at",
      )
      .eq("referrer_driver_id", driverId)
      .order("created_at", { ascending: true }),
    supabase
      .from("referral_attributions")
      .select(
        "id, referrer_driver_id, passenger_id, referral_code, created_at",
      )
      .eq("referrer_driver_id", driverId)
      .order("created_at", { ascending: false }),
  ]);

  if (
    (eventsRes.error && isMissingRelationError(eventsRes.error)) ||
    (attrsRes.error && isMissingRelationError(attrsRes.error))
  ) {
    return unavailableSnapshot(
      "Esquema de referidos del bot no aplicado (migraciones 040/041).",
      query,
      sort,
      pageSize,
    );
  }

  if (eventsRes.error) {
    throw new Error(eventsRes.error.message || "Error al leer referral_events");
  }
  if (attrsRes.error) {
    throw new Error(
      attrsRes.error.message || "Error al leer referral_attributions",
    );
  }

  const events = (eventsRes.data ?? []) as EventRow[];
  const attributions = (attrsRes.data ?? []) as AttributionRow[];

  const linkOpened = events.filter((e) => e.event_type === "link_opened");
  const registeredEvents = events.filter(
    (e) => e.event_type === "passenger_registered",
  );
  const conversionPassengerIds = new Set(
    events
      .filter((e) => e.event_type === "conversion" && e.passenger_id)
      .map((e) => e.passenger_id as string),
  );

  const passengerIds = attributions.map((a) => a.passenger_id);
  const passengers = await loadPassengersByIds(supabase, passengerIds);

  let beta = 0;
  let active = 0;
  for (const id of passengerIds) {
    const status = passengers.get(id)?.status ?? "";
    if (status === "BETA") beta += 1;
    if (status === "ACTIVE") active += 1;
  }

  // Registrados: eventos passenger_registered; fallback a attributions (fuente Ops).
  const registered = Math.max(registeredEvents.length, attributions.length);
  const invited = countInvitedPersons(linkOpened);
  const firstServiceCompleted = conversionPassengerIds.size;

  const allItems = attributions.map((attr) =>
    toListItem(
      attr,
      passengers.get(attr.passenger_id) ?? null,
      conversionPassengerIds.has(attr.passenger_id),
    ),
  );

  const filtered = filterReferralItems(allItems, query);
  const sorted = sortReferralItems(filtered, sort);
  const pageResult = paginateItems(sorted, page, pageSize);

  const linkCreatedAt =
    linkOpened[0]?.created_at ??
    events[0]?.created_at ??
    null;

  return {
    available: true,
    unavailableReason: null,
    link: code
      ? {
          code,
          inviteUrl: buildReferralInviteUrl(code),
          createdAt: linkCreatedAt,
          createdAtLabel: linkCreatedAt
            ? formatReferralDate(linkCreatedAt)
            : "—",
        }
      : null,
    stats: computeReferralStats({
      invited,
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

  const [eventsRes, attrsRes] = await Promise.all([
    supabase
      .from("referral_events")
      .select(
        "id, event_type, referral_code, referrer_driver_id, passenger_id, meta, created_at",
      ),
    supabase
      .from("referral_attributions")
      .select("id, referrer_driver_id, passenger_id, referral_code, created_at"),
  ]);

  if (
    (eventsRes.error && isMissingRelationError(eventsRes.error)) ||
    (attrsRes.error && isMissingRelationError(attrsRes.error))
  ) {
    return {
      ...emptyReferralsDashboard(),
      unavailableReason:
        "Esquema de referidos del bot no aplicado (migraciones 040/041).",
    };
  }

  if (eventsRes.error) {
    throw new Error(eventsRes.error.message || "Error al leer referral_events");
  }
  if (attrsRes.error) {
    throw new Error(
      attrsRes.error.message || "Error al leer referral_attributions",
    );
  }

  const events = (eventsRes.data ?? []) as EventRow[];
  const attributions = (attrsRes.data ?? []) as AttributionRow[];

  const linkOpened = events.filter((e) => e.event_type === "link_opened");
  const registeredEvents = events.filter(
    (e) => e.event_type === "passenger_registered",
  );

  const passengerIds = Array.from(
    new Set(attributions.map((a) => a.passenger_id)),
  );
  const passengers = await loadPassengersByIds(supabase, passengerIds);

  const byDriver = new Map<
    string,
    { invited: number; registered: number; active: number }
  >();

  // Invitados por conductor (link_opened)
  const openedByDriver = new Map<string, EventRow[]>();
  for (const event of linkOpened) {
    if (!event.referrer_driver_id) continue;
    const list = openedByDriver.get(event.referrer_driver_id) ?? [];
    list.push(event);
    openedByDriver.set(event.referrer_driver_id, list);
  }

  for (const [driverId, driverEvents] of openedByDriver) {
    const bucket = byDriver.get(driverId) ?? {
      invited: 0,
      registered: 0,
      active: 0,
    };
    bucket.invited = countInvitedPersons(driverEvents);
    byDriver.set(driverId, bucket);
  }

  for (const attr of attributions) {
    const bucket = byDriver.get(attr.referrer_driver_id) ?? {
      invited: 0,
      registered: 0,
      active: 0,
    };
    bucket.registered += 1;
    if (passengers.get(attr.passenger_id)?.status === "ACTIVE") {
      bucket.active += 1;
    }
    byDriver.set(attr.referrer_driver_id, bucket);
  }

  const invitedTotal = countInvitedPersons(linkOpened);
  const registeredTotal = Math.max(
    registeredEvents.length,
    attributions.length,
  );
  let activeTotal = 0;
  for (const id of passengerIds) {
    if (passengers.get(id)?.status === "ACTIVE") activeTotal += 1;
  }

  const invitedToRegistered = conversionRate(registeredTotal, invitedTotal);
  const registeredToActive = conversionRate(activeTotal, registeredTotal);

  const driverIds = Array.from(byDriver.keys());
  const driversRes =
    driverIds.length > 0
      ? await supabase
          .from("drivers")
          .select("id, name, full_name, preferred_name, phone")
          .in("id", driverIds)
      : { data: [] as DriverRow[], error: null };

  const drivers = new Map<string, DriverRow>();
  for (const row of (driversRes.data ?? []) as DriverRow[]) {
    drivers.set(row.id, row);
  }

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
