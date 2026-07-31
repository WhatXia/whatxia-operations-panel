import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  getBotOperationalStatus,
  updateBotOperationalStatus,
} from "@/lib/bot-operational-status/service";
import {
  isBotOperationalStatus,
  type BotOperationalStatusCode,
} from "@/lib/bot-operational-status/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_OPERATIONAL_STATUS",
      resource: "bot_operational_status",
      resourceId: "1",
      adminOnly: true,
      module: "configuration",
      level: "read",
    },
    async () => {
      try {
        const data = await getBotOperationalStatus();
        return NextResponse.json(
          { ok: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Error",
          },
          { status: 500 },
        );
      }
    },
  );
}

export async function PATCH(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "UPDATE_BOT_OPERATIONAL_STATUS",
      resource: "bot_operational_status",
      resourceId: "1",
      adminOnly: true,
      module: "configuration",
      level: "edit",
    },
    async ({ user }) => {
      let body: {
        status?: BotOperationalStatusCode;
        maintenanceMessage?: string;
      };
      try {
        body = await request.json();
      } catch {
        return {
          response: NextResponse.json(
            { ok: false, error: "JSON inválido" },
            { status: 400 },
          ),
        };
      }

      if (!isBotOperationalStatus(body.status)) {
        return {
          response: NextResponse.json(
            { ok: false, error: "Estado inválido (ACTIVE | MAINTENANCE)" },
            { status: 400 },
          ),
        };
      }

      try {
        const before = await getBotOperationalStatus();
        const data = await updateBotOperationalStatus({
          status: body.status,
          maintenanceMessage:
            typeof body.maintenanceMessage === "string"
              ? body.maintenanceMessage
              : before.maintenanceMessage,
          actorEmail: user.email,
          actorId: user.id,
        });

        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: "1",
          message:
            data.status === "MAINTENANCE"
              ? "Bot en mantenimiento"
              : "Bot activo",
          oldValues: {
            status: before.status,
            maintenance_message: before.maintenanceMessage,
          },
          newValues: {
            status: data.status,
            maintenance_message: data.maintenanceMessage,
          },
        };
      } catch (error) {
        return {
          response: NextResponse.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Error",
            },
            { status: 400 },
          ),
        };
      }
    },
  );
}
