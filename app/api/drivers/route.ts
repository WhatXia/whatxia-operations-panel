import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  parseDriverFilter,
  parseDriverSort,
} from "@/lib/drivers/filters";
import { fetchDriversSnapshot } from "@/lib/drivers/queries";
import type { DriversResponse } from "@/lib/drivers/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_DRIVERS", resource: "drivers" },
    async () => {
      const { searchParams } = new URL(request.url);
      const data = await fetchDriversSnapshot({
        filter: parseDriverFilter(searchParams.get("filter")),
        sort: parseDriverSort(searchParams.get("sort")),
        query: searchParams.get("q") ?? "",
      });
      const body: DriversResponse = { ok: true, data };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    },
  );
}
