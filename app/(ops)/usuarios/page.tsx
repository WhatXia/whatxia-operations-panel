import { UsersView } from "@/components/users/UsersView";
import { ensureUserRole } from "@/lib/auth/ensure-role";
import { userHasPermission } from "@/lib/auth/permissions";
import { permissionsFromUser, isSuperAdminUser } from "@/lib/auth/permission-resolve";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await ensureUserRole(user) : null;
  const canMutate = user
    ? userHasPermission(
        {
          role,
          isSuperAdmin: isSuperAdminUser(user),
          permissions: permissionsFromUser(user),
          app_metadata: user.app_metadata,
        },
        "passengers",
        "edit",
      )
    : false;

  return <UsersView canMutate={canMutate} />;
}
