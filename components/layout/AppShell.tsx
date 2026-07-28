"use client";

import { useState, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ReauthProvider } from "@/components/security/ReauthProvider";
import type { AuthUserView } from "@/lib/auth/types";

export function AppShell({
  children,
  user,
  variant = "ops",
}: {
  children: ReactNode;
  user: AuthUserView;
  variant?: "ops" | "admin";
}) {
  const [open, setOpen] = useState(false);

  return (
    <ReauthProvider>
      <div className="wx-shell-bg flex min-h-screen">
        <Sidebar
          open={open}
          onClose={() => setOpen(false)}
          user={user}
          variant={variant}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenuClick={() => setOpen(true)}
            user={user}
            variant={variant}
          />
          <main className="wx-scrollbar flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ReauthProvider>
  );
}
