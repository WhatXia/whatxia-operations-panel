import { NextResponse } from "next/server";
import { withAuditedApi } from "@/lib/audit/api";
import {
  createMediaFromUrl,
  listMedia,
  uploadMediaFile,
} from "@/lib/bot-cms/service";
import type { BotMediaType } from "@/lib/bot-cms/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "VIEW_BOT_MEDIA",
      resource: "bot_media",
      adminOnly: true,
      module: "bot_cms",
      level: "read",
    },
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const data = await listMedia({
          q: searchParams.get("q") ?? undefined,
          type: searchParams.get("type") ?? undefined,
          tag: searchParams.get("tag") ?? undefined,
        });
        return NextResponse.json({ ok: true, data });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al listar multimedia",
          },
          { status: 500 },
        );
      }
    },
  );
}

export async function POST(request: Request) {
  return withAuditedApi(
    request,
    {
      action: "BOT_MEDIA_UPLOAD",
      resource: "bot_media",
      adminOnly: true,
      module: "bot_cms",
      level: "create",
    },
    async ({ user }) => {
      const contentType = request.headers.get("content-type") || "";
      const actor = { id: user.id, email: user.email };

      try {
        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData();
          const file = form.get("file");
          const name = String(form.get("name") || "");
          const description = form.get("description")
            ? String(form.get("description"))
            : null;
          const mediaType = String(form.get("media_type") || "image") as BotMediaType;
          const tagsRaw = String(form.get("tags") || "");
          const tags = tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

          if (!(file instanceof File)) {
            return {
              response: NextResponse.json(
                { ok: false, error: "Archivo requerido" },
                { status: 400 },
              ),
            };
          }

          const buffer = new Uint8Array(await file.arrayBuffer());
          const data = await uploadMediaFile(
            {
              fileName: file.name,
              contentType: file.type,
              bytes: buffer,
              name: name || file.name,
              description,
              media_type: mediaType,
              tags,
            },
            actor,
          );

          return {
            response: NextResponse.json({ ok: true, data }),
            resourceId: data.id,
            message: `Multimedia subida ${data.name}`,
            newValues: {
              name: data.name,
              media_type: data.media_type,
              size_bytes: data.size_bytes,
            },
          };
        }

        const body = await request.json();
        const data = await createMediaFromUrl(
          {
            name: body.name,
            description: body.description,
            media_type: body.media_type,
            external_url: body.external_url,
            tags: body.tags,
            code: body.code,
          },
          actor,
        );
        return {
          response: NextResponse.json({ ok: true, data }),
          resourceId: data.id,
          message: `Multimedia registrada ${data.name}`,
          newValues: { name: data.name, media_type: data.media_type },
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
