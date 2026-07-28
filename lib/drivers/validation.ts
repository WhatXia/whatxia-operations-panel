/**
 * Validación de campos editables de la Ficha del Conductor
 * (PANEL-DRIVERS-003 / 003.1 — ficha completa).
 */

export type DriverAdminStatus = "active" | "suspended" | "inactive";

export const DRIVER_ADMIN_STATUSES: {
  id: DriverAdminStatus;
  label: string;
}[] = [
  { id: "active", label: "Activo" },
  { id: "inactive", label: "Inactivo" },
  { id: "suspended", label: "Suspendido" },
];

/** Suspensión indefinida desde el panel (compatible con bot vía suspended_until). */
export const PANEL_INDEFINITE_SUSPENSION_ISO = "2099-12-31T23:59:59.000Z";

/** Formulario unificado: Información + Vehículo (+ Documentos cuando aplique). */
export type DriverProfileEditableInput = {
  // Información
  email: string;
  address: string;
  city: string;
  phone: string;
  adminStatus: DriverAdminStatus;
  internalNotes: string;
  // Vehículo
  plate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
};

export type ValidationIssue = {
  field: keyof DriverProfileEditableInput | "form";
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLATE_RE = /^[A-Za-z0-9\-]{5,10}$/;

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function validateDriverEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) return null;
  if (email.length > 254) return "Correo demasiado largo";
  if (!EMAIL_RE.test(email)) return "Formato de correo inválido";
  return null;
}

export function validateDriverPhone(raw: string): string | null {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return "El número de WhatsApp es obligatorio";
  if (digits.length < 10 || digits.length > 15) {
    return "Teléfono inválido (use 10–15 dígitos, con código de país si aplica)";
  }
  return null;
}

export function validateDriverPlate(raw: string): string | null {
  const plate = raw.trim().toUpperCase();
  if (!plate) return "La placa es obligatoria";
  if (!PLATE_RE.test(plate)) {
    return "Placa inválida (5–10 caracteres alfanuméricos)";
  }
  return null;
}

export function validateVehicleYear(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{4}$/.test(trimmed)) return "Año inválido (4 dígitos)";
  const year = Number(trimmed);
  const max = new Date().getFullYear() + 1;
  if (year < 1980 || year > max) {
    return `Año fuera de rango (1980–${max})`;
  }
  return null;
}

export function validateDriverProfileInput(
  input: DriverProfileEditableInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const emailError = validateDriverEmail(input.email);
  if (emailError) issues.push({ field: "email", message: emailError });

  const phoneError = validateDriverPhone(input.phone);
  if (phoneError) issues.push({ field: "phone", message: phoneError });

  const plateError = validateDriverPlate(input.plate);
  if (plateError) issues.push({ field: "plate", message: plateError });

  const yearError = validateVehicleYear(input.vehicleYear);
  if (yearError) issues.push({ field: "vehicleYear", message: yearError });

  if (!DRIVER_ADMIN_STATUSES.some((s) => s.id === input.adminStatus)) {
    issues.push({ field: "adminStatus", message: "Estado inválido" });
  }

  if (input.address.trim().length > 500) {
    issues.push({ field: "address", message: "Dirección demasiado larga" });
  }
  if (input.city.trim().length > 120) {
    issues.push({ field: "city", message: "Ciudad demasiado larga" });
  }
  if (input.internalNotes.trim().length > 4000) {
    issues.push({
      field: "internalNotes",
      message: "Observaciones demasiado largas",
    });
  }
  if (input.vehicleBrand.trim().length > 80) {
    issues.push({ field: "vehicleBrand", message: "Marca demasiado larga" });
  }
  if (input.vehicleModel.trim().length > 80) {
    issues.push({ field: "vehicleModel", message: "Modelo demasiado largo" });
  }
  if (input.vehicleColor.trim().length > 60) {
    issues.push({ field: "vehicleColor", message: "Color demasiado largo" });
  }

  return issues;
}

export function sanitizeDriverProfileInput(input: DriverProfileEditableInput): {
  email: string | null;
  address: string | null;
  city: string | null;
  phone: string;
  adminStatus: DriverAdminStatus;
  internalNotes: string | null;
  plate: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleYear: number | null;
} {
  const yearRaw = input.vehicleYear.trim();
  return {
    email: input.email.trim() || null,
    address: input.address.trim() || null,
    city: input.city.trim() || null,
    phone: normalizePhoneDigits(input.phone),
    adminStatus: input.adminStatus,
    internalNotes: input.internalNotes.trim() || null,
    plate: input.plate.trim().toUpperCase(),
    vehicleBrand: input.vehicleBrand.trim() || null,
    vehicleModel: input.vehicleModel.trim() || null,
    vehicleColor: input.vehicleColor.trim() || null,
    vehicleYear: yearRaw ? Number(yearRaw) : null,
  };
}
