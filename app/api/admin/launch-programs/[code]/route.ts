import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  deactivateLaunchProgram,
  fetchLaunchProgramByCode,
  fetchPendingOutboundMessages,
  markOutboundMessage,
  updateLaunchProgramFields,
} from "@/lib/launch-programs/queries";
import type { LaunchProgramUpdateInput } from "@/lib/launch-programs/types";
import {
  hasWhatsAppCredentials,
  sendWhatsAppText,
} from "@/lib/launch-programs/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase();

  return withAuditedApi(
    request,
    {
      action: "VIEW_LAUNCH_PROGRAM",
      resource: "launch_program",
      resourceId: normalized,
      module: "configuration",
      level: "read",
    },
    async () => {
      try {
        const data = await fetchLaunchProgramByCode(normalized);
        if (!data) {
          return NextResponse.json(
            { ok: false, error: "Programa no encontrado" },
            { status: 404 },
          );
        }
        return NextResponse.json(
          { ok: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al leer programa";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
      }
    },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase();

  return withAuditedApi(
    request,
    {
      action: "UPDATE_LAUNCH_PROGRAM",
      resource: "launch_program",
      resourceId: normalized,
      module: "configuration",
      level: "edit",
    },
    async ({ user }) => {
      let payload: LaunchProgramUpdateInput & { deactivate?: boolean };
      try {
        payload = await request.json();
      } catch {
        return {
          response: NextResponse.json(
            { ok: false, error: "JSON inválido" },
            { status: 400 },
          ),
        };
      }

      try {
        const current = await fetchLaunchProgramByCode(normalized);
        if (!current) {
          return {
            response: NextResponse.json(
              { ok: false, error: "Programa no encontrado" },
              { status: 404 },
            ),
          };
        }

        const wantsDeactivate =
          payload.deactivate === true ||
          (payload.isActive === false && current.isActive);

        if (wantsDeactivate) {
          const { detail, result } = await deactivateLaunchProgram(
            normalized,
            { email: user.email, id: user.id },
            "manual",
          );

          let sent = 0;
          let failed = 0;
          if (result.queuedMessages && hasWhatsAppCredentials()) {
            const pending = await fetchPendingOutboundMessages(200);
            for (const msg of pending) {
              try {
                await sendWhatsAppText(msg.phone, msg.body);
                await markOutboundMessage(msg.id, "sent");
                sent += 1;
              } catch (err) {
                failed += 1;
                await markOutboundMessage(
                  msg.id,
                  "failed",
                  err instanceof Error ? err.message : "send_failed",
                );
              }
            }
          }

          return {
            response: NextResponse.json(
              {
                ok: true,
                data: detail,
                deactivate: { ...result, messagesSent: sent, messagesFailed: failed },
              },
              { headers: { "Cache-Control": "no-store" } },
            ),
            resourceId: normalized,
            message: result.alreadyInactive
              ? `Programa ${normalized} ya estaba inactivo`
              : `Programa ${normalized} desactivado; ${result.activatedCount} PIONEER → ACTIVE`,
            oldValues: { isActive: true, status: "PIONEER" },
            newValues: {
              isActive: false,
              activatedCount: result.activatedCount,
              massActivatedAt: detail.massActivatedAt,
            },
          };
        }

        const data = await updateLaunchProgramFields(normalized, {
          isActive: payload.isActive,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          maxQuota: payload.maxQuota,
          autoActivateOnEnd: payload.autoActivateOnEnd,
          welcomeMessage: payload.welcomeMessage,
          activationMessage: payload.activationMessage,
        });

        return {
          response: NextResponse.json(
            { ok: true, data },
            { headers: { "Cache-Control": "no-store" } },
          ),
          resourceId: normalized,
          message: `Programa ${normalized} actualizado`,
          oldValues: {
            isActive: current.isActive,
            startsAt: current.startsAt,
            endsAt: current.endsAt,
            maxQuota: current.maxQuota,
          },
          newValues: {
            isActive: data.isActive,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            maxQuota: data.maxQuota,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al actualizar";
        const status = message.includes("no encontrado") ? 404 : 400;
        return {
          response: NextResponse.json({ ok: false, error: message }, { status }),
          message,
        };
      }
    },
  );
}
