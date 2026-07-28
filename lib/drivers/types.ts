export type DriverFilter =
  | "all"
  | "active"
  | "inactive"
  | "available"
  | "busy";

export type DriverSort = "newest" | "name_asc" | "name_desc";

export type DriverAdminStatus = "active" | "suspended" | "inactive";

export type DriverListItem = {
  id: string;
  name: string;
  documentId: string | null;
  phone: string;
  phoneMasked: string;
  plate: string;
  vehicleLabel: string;
  status: "active" | "inactive" | string;
  statusLabel: string;
  adminStatus: DriverAdminStatus;
  availability: "available" | "busy";
  availabilityLabel: string;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  balanceLabel: string;
  createdAt: string;
};

export type DriverDetail = DriverListItem & {
  fullName: string | null;
  preferredName: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  cityId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleYear: number | null;
  soatExpiresAt: string | null;
  technoExpiresAt: string | null;
  operationExpiresAt: string | null;
  licenseExpiresAt: string | null;
  documentsBlocked: boolean;
  documentsBlockedReason: string | null;
  documentsReminderSentAt: string | null;
  cancelPolicyCount: number;
  suspendedUntil: string | null;
  internalNotes: string | null;
  createdAtLabel: string;
};

export type DriverProfilePatch = {
  email: string;
  address: string;
  city: string;
  phone: string;
  adminStatus: DriverAdminStatus;
  internalNotes: string;
  plate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
};

export type DriversSnapshot = {
  fetchedAt: string;
  fetchedAtLabel: string;
  timezone: string;
  filter: DriverFilter;
  sort: DriverSort;
  query: string;
  total: number;
  hasBalanceColumn: boolean;
  drivers: DriverListItem[];
};

export type DriversResponse =
  | { ok: true; data: DriversSnapshot }
  | { ok: false; error: string };

export type DriverDetailResponse =
  | { ok: true; data: DriverDetail }
  | { ok: false; error: string };

export type DriverUpdateResponse =
  | {
      ok: true;
      data: DriverDetail;
      changes: Array<{
        field: string;
        label: string;
        oldValue: unknown;
        newValue: unknown;
      }>;
    }
  | { ok: false; error: string };
