import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { listLaunchPrograms } from "@/lib/launch-programs/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_LAUNCH_PROGRAMS",
      resource: "launch_programs",
      module: "configuration",
      level: "read",
    },
    async () => {
      try {
        const data = await listLaunchPrograms();
        return NextResponse.json(
          { ok: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al listar programas";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
      }
    },
  );
}
