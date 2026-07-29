/** Estados exactos del bot (USER-001 / migration 038). No inventar otros. */
export const PASSENGER_STATUSES = [
  "PIONEER",
  "BETA",
  "ACTIVE",
  "BLOCKED",
] as const;

export type PassengerStatus = (typeof PASSENGER_STATUSES)[number];

export type PassengerStatusFilter = "all" | PassengerStatus;

export type PassengerListItem = {
  id: string;
  name: string;
  phone: string;
  status: PassengerStatus;
  registeredAt: string | null;
  lastInteractionAt: string | null;
};

export type PassengerDetail = PassengerListItem & {
  preferredName: string | null;
  whatsappName: string | null;
  fullName: string | null;
  registrationSource: string | null;
  lastConversationId: string | null;
  lastTrip: {
    id: string;
    status: string;
    originText: string | null;
    destinationText: string | null;
    createdAt: string | null;
  } | null;
};

export type PassengerStatusAction =
  | "invite_beta"
  | "activate"
  | "block"
  | "unblock";
