import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ensureUserRole } from "@/lib/auth/ensure-role";
import { toAuthUserView } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

export default async function OpsLayout({
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
  if (!user.app_metadata?.role) {
    await supabase.auth.refreshSession();
  }

  const view = toAuthUserView({
    ...user,
    app_metadata: { ...(user.app_metadata ?? {}), role },
  });

  return <AppShell user={view}>{children}</AppShell>;
}
