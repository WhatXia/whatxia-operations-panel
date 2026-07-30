/** CFG-001 — Programas de Lanzamiento */

export const PIONEERS_USERS_CODE = "PIONEERS_USERS" as const;

export type LaunchProgramCode = string;

export type LaunchProgramRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxQuota: number | null;
  autoActivateOnEnd: boolean;
  welcomeMessage: string | null;
  activationMessage: string | null;
  massActivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LaunchProgramDashboard = {
  isActive: boolean;
  registeredPioneers: number;
  maxQuota: number | null;
  quotaLabel: string;
  startsAt: string | null;
  startsAtLabel: string;
  endsAt: string | null;
  endsAtLabel: string;
  pendingActivation: number;
  massActivatedAt: string | null;
  massActivatedAtLabel: string;
};

export type LaunchProgramDetail = LaunchProgramRow & {
  dashboard: LaunchProgramDashboard;
  startsAtLabel: string;
  endsAtLabel: string;
  massActivatedAtLabel: string;
  updatedAtLabel: string;
};

export type LaunchProgramListItem = {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  href: string;
};

export type LaunchProgramUpdateInput = {
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxQuota?: number | null;
  autoActivateOnEnd?: boolean;
  welcomeMessage?: string | null;
  activationMessage?: string | null;
};

export type DeactivateLaunchProgramResult = {
  ok: true;
  alreadyInactive: boolean;
  activatedCount: number;
  runId: string | null;
  queuedMessages: boolean;
};
