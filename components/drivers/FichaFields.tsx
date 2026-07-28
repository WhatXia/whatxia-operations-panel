"use client";

import type { ReactNode } from "react";
import { DRIVER_FICHA_INPUT_CLASS } from "@/lib/drivers/ficha-form";

export function FichaField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function FichaEditableField({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string | null;
}) {
  return (
    <label className="grid gap-1 rounded-lg border border-border-subtle bg-surface px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export { DRIVER_FICHA_INPUT_CLASS as fichaInputClass };
