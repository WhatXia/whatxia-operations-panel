import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { parsePassengerFilter } from "@/lib/passengers/filters";
import {
  fetchPassengersSnapshot,
  type PassengersResponse,
} from "@/lib/passengers/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_PASSENGERS",
      resource: "passengers",
      module: "passengers",
      level: "read",
    },
    async () => {
      const { searchParams } = new URL(request.url);
      try {
        const data = await fetchPassengersSnapshot({
          filter: parsePassengerFilter(searchParams.get("filter")),
          query: searchParams.get("q") ?? "",
        });
        const body: PassengersResponse = { ok: true, data };
        return NextResponse.json(body, {
          headers: { "Cache-Control": "no-store" },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al consultar usuarios finales";
        const body: PassengersResponse = { ok: false, error: message };
        return NextResponse.json(body, { status: 500 });
      }
    },
  );
}
