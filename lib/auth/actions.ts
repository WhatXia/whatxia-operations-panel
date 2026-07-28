"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { writeAuditLogSafe } from "@/lib/audit/service";
import { parseUserAgent } from "@/lib/audit/ua";
import { getRoleFromUser } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerStore = await headers();
  const ua = parseUserAgent(headerStore.get("user-agent"));
  const role = getRoleFromUser(user);

  await writeAuditLogSafe({
    action: "LOGOUT",
    result: "OK",
    module: "auth",
    path: "/logout",
    message: "Cierre de sesión",
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    role,
    sessionId: user?.id ? `sess_${user.id.slice(0, 8)}` : null,
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip"),
    browser: ua.browser,
    os: ua.os,
    device: ua.device,
  });

  await supabase.auth.signOut();
  redirect("/login");
}
