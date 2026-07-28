import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import { prepareConversationPdfExport } from "@/lib/conversations/export/pdf";
import { fetchConversationDetail } from "@/lib/conversations/queries";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return withAuditedApi(
    request,
    {
      action: "EXPORT_DATA",
      resource: "conversation",
      resourceId: id,
      module: "conversations",
      level: "read",
    },
    async () => {
      try {
        const detail = await fetchConversationDetail(id);
        const result = await prepareConversationPdfExport(detail);
        return {
          response: NextResponse.json(result),
          resourceId: id,
          message: result.message,
          newValues: {
            ready: result.ready,
            filename: result.filename,
            blockers: result.blockers,
          },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Error al preparar exportación",
            },
            { status: 500 },
          ),
        };
      }
    },
  );
}
