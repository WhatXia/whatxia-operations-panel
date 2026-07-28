import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTimeLabel,
  getOpsTimezone,
} from "@/lib/dashboard/time";
import type { DriverFilter, DriverSort } from "@/lib/drivers/types";
import type {
  DriverDetail,
  DriverListItem,
  DriversSnapshot,
} from "@/lib/drivers/types";
import {
  availabilityLabel,
  deriveAdminStatus,
  driverDisplayName,
  formatDetailDate,
  formatLastActivity,
  formatVehicleLabel,
  maskPhone,
  statusLabel,
} from "@/lib/drivers/format";

type DriverRow = {
  id: string;
  phone: string;
  name: string;
  full_name: string | null;
  preferred_name: string | null;
  plate: string;
  document_id: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  city_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  soat_expires_at: string | null;
  techno_expires_at: string | null;
  operation_expires_at: string | null;
  license_expires_at: string | null;
  is_available: boolean;
  status: string;
  documents_blocked: boolean;
  documents_blocked_reason: string | null;
  documents_reminder_sent_at: string | null;
  cancel_policy_count: number | null;
  suspended_until: string | null;
  internal_notes: string | null;
  created_at: string;
};

type TripActivityRow = {
  driver_id: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const DRIVER_SELECT_BASE =
  "id, phone, name, full_name, preferred_name, plate, document_id, email, address, city, city_id, emergency_contact_name, emergency_contact_phone, vehicle_brand, vehicle_model, vehicle_color, vehicle_year, soat_expires_at, techno_expires_at, operation_expires_at, license_expires_at, is_available, status, documents_blocked, documents_blocked_reason, documents_reminder_sent_at, cancel_policy_count, suspended_until, created_at";

const DRIVER_SELECT_WITH_NOTES = `${DRIVER_SELECT_BASE}, internal_notes`;

function toListItem(
  row: DriverRow,
  lastActivityAt: string | null,
  now: Date,
): DriverListItem {
  const availability = availabilityLabel(Boolean(row.is_available));
  const adminStatus = deriveAdminStatus(row);
  return {
    id: row.id,
    name: driverDisplayName(row),
    documentId: row.document_id,
    phone: row.phone,
    phoneMasked: maskPhone(row.phone),
    plate: row.plate?.trim() || "—",
    vehicleLabel: formatVehicleLabel(row),
    status: row.status,
    statusLabel: statusLabel(row.status, row.suspended_until),
    adminStatus,
    availability: availability.key,
    availabilityLabel: availability.label,
    lastActivityAt,
    lastActivityLabel: formatLastActivity(lastActivityAt, now),
    balanceLabel: "—",
    createdAt: row.created_at,
  };
}

function toDetail(
  row: DriverRow,
  lastActivityAt: string | null,
  now: Date,
): DriverDetail {
  const base = toListItem(row, lastActivityAt, now);
  return {
    ...base,
    fullName: row.full_name,
    preferredName: row.preferred_name,
    email: row.email,
    address: row.address,
    city: row.city,
    cityId: row.city_id,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    vehicleBrand: row.vehicle_brand,
    vehicleModel: row.vehicle_model,
    vehicleColor: row.vehicle_color,
    vehicleYear: row.vehicle_year,
    soatExpiresAt: row.soat_expires_at,
    technoExpiresAt: row.techno_expires_at,
    operationExpiresAt: row.operation_expires_at,
    licenseExpiresAt: row.license_expires_at,
    documentsBlocked: Boolean(row.documents_blocked),
    documentsBlockedReason: row.documents_blocked_reason,
    documentsReminderSentAt: row.documents_reminder_sent_at,
    cancelPolicyCount: row.cancel_policy_count ?? 0,
    suspendedUntil: row.suspended_until,
    internalNotes: row.internal_notes ?? null,
    createdAtLabel: formatDetailDate(row.created_at),
  };
}

function matchesQuery(item: DriverListItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    (item.documentId?.toLowerCase().includes(q) ?? false) ||
    item.plate.toLowerCase().includes(q) ||
    item.phone.toLowerCase().includes(q) ||
    item.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
  );
}

function applyFilter(item: DriverListItem, filter: DriverFilter) {
  switch (filter) {
    case "active":
      return item.adminStatus === "active";
    case "inactive":
      return item.adminStatus === "inactive";
    case "available":
      return item.availability === "available";
    case "busy":
      return item.availability === "busy";
    default:
      return true;
  }
}

function sortDrivers(items: DriverListItem[], sort: DriverSort) {
  const copy = [...items];
  switch (sort) {
    case "name_asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name, "es"));
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

async function fetchLastActivityMap(
  supabase: ReturnType<typeof createAdminClient>,
  driverIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (driverIds.length === 0) return map;

  const { data, error } = await supabase
    .from("trips")
    .select("driver_id, updated_at, created_at")
    .in("driver_id", driverIds)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    return map;
  }

  for (const row of (data ?? []) as TripActivityRow[]) {
    if (!row.driver_id || map.has(row.driver_id)) continue;
    const at = row.updated_at || row.created_at;
    if (at) map.set(row.driver_id, at);
  }

  return map;
}

async function selectDrivers(
  supabase: ReturnType<typeof createAdminClient>,
  driverId?: string,
): Promise<{ data: unknown; error: { message: string; code?: string } | null }> {
  if (driverId) {
    const withNotes = await supabase
      .from("drivers")
      .select(DRIVER_SELECT_WITH_NOTES)
      .eq("id", driverId)
      .maybeSingle();

    if (
      withNotes.error &&
      (withNotes.error.message.includes("internal_notes") ||
        withNotes.error.code === "42703")
    ) {
      return supabase
        .from("drivers")
        .select(DRIVER_SELECT_BASE)
        .eq("id", driverId)
        .maybeSingle();
    }
    return withNotes;
  }

  const withNotes = await supabase
    .from("drivers")
    .select(DRIVER_SELECT_WITH_NOTES)
    .order("created_at", { ascending: false });

  if (
    withNotes.error &&
    (withNotes.error.message.includes("internal_notes") ||
      withNotes.error.code === "42703")
  ) {
    return supabase
      .from("drivers")
      .select(DRIVER_SELECT_BASE)
      .order("created_at", { ascending: false });
  }

  return withNotes;
}

function normalizeRow(row: Record<string, unknown>): DriverRow {
  return {
    ...(row as unknown as DriverRow),
    internal_notes:
      typeof row.internal_notes === "string" ? row.internal_notes : null,
  };
}

export async function fetchDriversSnapshot(options: {
  filter?: DriverFilter;
  sort?: DriverSort;
  query?: string;
}): Promise<DriversSnapshot> {
  const filter = options.filter ?? "all";
  const sort = options.sort ?? "newest";
  const query = options.query?.trim() ?? "";
  const now = new Date();
  const supabase = createAdminClient();

  const { data, error } = await selectDrivers(supabase);

  if (error) {
    throw new Error(error.message || "Error al consultar conductores");
  }

  const rows = ((data as Record<string, unknown>[] | null) ?? []).map(
    normalizeRow,
  );
  const activityMap = await fetchLastActivityMap(
    supabase,
    rows.map((r) => r.id),
  );

  let items = rows.map((row) =>
    toListItem(row, activityMap.get(row.id) ?? null, now),
  );
  items = items.filter((item) => applyFilter(item, filter));
  items = items.filter((item) => matchesQuery(item, query));
  items = sortDrivers(items, sort);

  const fetchedAt = now.toISOString();

  return {
    fetchedAt,
    fetchedAtLabel: formatDateTimeLabel(fetchedAt),
    timezone: getOpsTimezone(),
    filter,
    sort,
    query,
    total: items.length,
    hasBalanceColumn: false,
    drivers: items,
  };
}

export async function fetchDriverDetail(
  driverId: string,
): Promise<DriverDetail> {
  const now = new Date();
  const supabase = createAdminClient();

  const { data, error } = await selectDrivers(supabase, driverId);

  if (error) {
    throw new Error(error.message || "Error al consultar conductor");
  }
  if (!data) {
    throw new Error("Conductor no encontrado");
  }

  const row = normalizeRow(data as Record<string, unknown>);
  const activityMap = await fetchLastActivityMap(supabase, [row.id]);
  return toDetail(row, activityMap.get(row.id) ?? null, now);
}
