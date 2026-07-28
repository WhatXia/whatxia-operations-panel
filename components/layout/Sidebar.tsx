"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WhatXiaMark } from "@/components/brand/WhatXiaMark";
import { NavIcon } from "@/components/layout/NavIcons";
import { levelAtLeast } from "@/lib/auth/permission-catalog";
import type { AuthUserView } from "@/lib/auth/types";
import { adminNav, mainNav } from "@/lib/nav";

function canSeeModule(user: AuthUserView, module: string) {
  if (user.isSuperAdmin) return true;
  const level = user.permissions?.[module as keyof typeof user.permissions] ?? "none";
  return levelAtLeast(level, "read");
}

export function Sidebar({
  open,
  onClose,
  user,
  variant = "ops",
}: {
  open: boolean;
  onClose: () => void;
  user: AuthUserView;
  variant?: "ops" | "admin";
}) {
  const pathname = usePathname();
  const visibleMain = mainNav.filter((item) => canSeeModule(user, item.module));
  const visibleAdmin = adminNav.filter((item) => canSeeModule(user, item.module));
  const showAdmin = user.isSuperAdmin || user.canAccessAdmin || visibleAdmin.length > 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
          <WhatXiaMark size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-2 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <nav className="wx-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Operación
          </p>
          {visibleMain.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted-strong hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <NavIcon
                  name={item.icon}
                  className={`h-5 w-5 ${active ? "text-brand" : ""}`}
                />
                <span>{item.label}</span>
                {active ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}

          {showAdmin && visibleAdmin.length > 0 ? (
            <>
              <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Administración
              </p>
              {visibleAdmin.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-muted-strong hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                    ) : null}
                  </Link>
                );
              })}
            </>
          ) : null}
        </nav>

        <div className="border-t border-border-subtle p-4">
          <div className="rounded-xl border border-border bg-surface-elevated p-3">
            <p className="text-xs font-medium text-muted">Entorno</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {variant === "admin" ? "Administración" : "Operativo"}
            </p>
            <p className="mt-1 text-xs text-muted">{user.roleLabel}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
