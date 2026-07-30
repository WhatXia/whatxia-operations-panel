import { NextResponse } from "next/server";
import {
  getPublishedConversationTree,
  getPublishedMessageByCode,
  listPublishedConversationTrees,
} from "@/lib/bot-cms/conversation-service";
import { isBotAudience } from "@/lib/bot-cms/conversation-types";
import {
  isBotEnvironment,
  type BotEnvironment,
} from "@/lib/bot-cms/types";

export const dynamic = "force-dynamic";

/**
 * Consumo runtime: solo configuración PUBLISHED.
 * Auth: header x-bot-cms-secret === BOT_CMS_CONSUMER_SECRET
 */
function authorize(request: Request): boolean {
  const expected = process.env.BOT_CMS_CONSUMER_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-bot-cms-secret");
  return Boolean(provided && provided === expected);
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const envParam = searchParams.get("environment");
    const environment: BotEnvironment = isBotEnvironment(envParam)
      ? envParam
      : "PRODUCTION";
    const treeCode = searchParams.get("tree");
    const messageCode = searchParams.get("message");
    const audienceRaw = searchParams.get("audience");
    const audience = isBotAudience(audienceRaw) ? audienceRaw : undefined;

    if (messageCode) {
      const data = await getPublishedMessageByCode(messageCode);
      if (!data) {
        return NextResponse.json(
          { ok: false, error: "Mensaje no publicado" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    if (treeCode) {
      const data = await getPublishedConversationTree(treeCode, environment);
      if (!data) {
        return NextResponse.json(
          { ok: false, error: "Árbol no publicado" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    const data = await listPublishedConversationTrees(audience, environment);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error",
      },
      { status: 500 },
    );
  }
}
