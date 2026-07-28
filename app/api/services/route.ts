import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  parseServiceFilter,
  parseServiceSort,
} from "@/lib/services/filters";
import { fetchServicesSnapshot } from "@/lib/services/queries";
import type { ServicesResponse } from "@/lib/services/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    { action: "VIEW_SERVICES", resource: "services" },
    async () => {
      const { searchParams } = new URL(request.url);
      const data = await fetchServicesSnapshot({
        filter: parseServiceFilter(searchParams.get("filter")),
        sort: parseServiceSort(searchParams.get("sort")),
        query: searchParams.get("q") ?? "",
      });
      const body: ServicesResponse = { ok: true, data };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    },
  );
}
