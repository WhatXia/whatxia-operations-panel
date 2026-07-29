import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  fetchDriverReferralsSnapshot,
  parseReferralSort,
} from "@/lib/referrals/queries";
import type { DriverReferralsResponse } from "@/lib/referrals/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "VIEW_DRIVER_REFERRALS",
      resource: "driver_referrals",
      resourceId: id,
      module: "drivers",
      level: "read",
    },
    async () => {
      if (!id) {
        const body: DriverReferralsResponse = {
          ok: false,
          error: "ID inválido",
        };
        return NextResponse.json(body, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const page = Number(searchParams.get("page") ?? "1");
      const pageSize = Number(searchParams.get("pageSize") ?? "10");

      try {
        const data = await fetchDriverReferralsSnapshot(id, {
          query: searchParams.get("q") ?? "",
          sort: parseReferralSort(searchParams.get("sort")),
          page: Number.isFinite(page) ? page : 1,
          pageSize: Number.isFinite(pageSize) ? pageSize : 10,
        });
        const body: DriverReferralsResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al consultar referidos";
        const body: DriverReferralsResponse = { ok: false, error: message };
        return NextResponse.json(body, { status: 500 });
      }
    },
  );
}
