"use client";

import { NavIcon } from "@/components/layout/NavIcons";
import { signOut } from "@/lib/auth/actions";
import type { AuthUserView } from "@/lib/auth/types";
import { mockDashboard } from "@/lib/mock-data";

export function Header({
  onMenuClick,
  user,
  variant = "ops",
}: {
  onMenuClick: () => void;
  user: AuthUserView;
  variant?: "ops" | "admin";
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border-subtle bg-surface/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-border p-2 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <NavIcon name="menu" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {variant === "admin"
              ? "Centro de Administración"
              : "Centro de Operaciones"}
          </p>
          <p className="truncate text-xs text-muted">
            {user.roleLabel} · Actualizado {mockDashboard.lastUpdated}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-muted-strong">
            Bot {mockDashboard.botStatus}
          </span>
        </div>

        <div className="hidden rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand md:inline-flex">
          {user.roleLabel}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/20 font-display text-sm font-bold text-brand">
            {user.initials}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-xs font-semibold text-foreground">
              {user.name}
            </span>
            <span className="block truncate text-[11px] text-muted">
              {user.email}
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-strong transition hover:bg-surface-hover hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
