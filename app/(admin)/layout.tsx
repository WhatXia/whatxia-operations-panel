import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ensureUserRole } from "@/lib/auth/ensure-role";
import { userHasPermission } from "@/lib/auth/permissions";
import { isSuperAdmin } from "@/lib/auth/roles";
import {
  isSuperAdminUser,
  permissionsFromUser,
} from "@/lib/auth/permission-resolve";
import { toAuthUserView } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await ensureUserRole(user);
  const subject = {
    role,
    isSuperAdmin: isSuperAdminUser(user) || isSuperAdmin(role),
    permissions: permissionsFromUser(user),
    app_metadata: {
      ...(user.app_metadata ?? {}),
      role,
    },
  };

  const canAdmin =
    subject.isSuperAdmin ||
    userHasPermission(subject, "users", "read") ||
    userHasPermission(subject, "roles", "read") ||
    userHasPermission(subject, "audit", "read") ||
    userHasPermission(subject, "configuration", "read");

  if (!canAdmin) {
    redirect("/forbidden");
  }

  const view = toAuthUserView({
    ...user,
    app_metadata: { ...(user.app_metadata ?? {}), role },
  });

  return (
    <AppShell user={view} variant="admin">
      {children}
    </AppShell>
  );
}
