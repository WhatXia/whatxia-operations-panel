"use client";

import {
  BOT_CONTENT_TYPE_LABELS,
  previewMessageBody,
  type BotContentType,
  type BotInteractivePayload,
  type BotLocationPayload,
  type BotMediaAsset,
} from "@/lib/bot-cms/types";

type Props = {
  body: string;
  contentType: BotContentType;
  media: BotMediaAsset[];
  location: BotLocationPayload | null;
  interactive: BotInteractivePayload;
};

function sortedButtons(items: { id: string; title: string; sort_order: number }[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export function WhatsAppPreview({
  body,
  contentType,
  media,
  location,
  interactive,
}: Props) {
  const text = previewMessageBody(body);
  const primaryMedia = media[0] ?? null;
  const buttons =
    interactive.kind === "options"
      ? sortedButtons(interactive.options ?? [])
      : sortedButtons(interactive.buttons ?? []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0b141a]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#1f2c34] px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884] text-xs font-bold text-white">
          WX
        </div>
        <div>
          <p className="text-sm font-medium text-white">WhatXia Bot</p>
          <p className="text-[10px] text-white/50">
            Vista previa · {BOT_CONTENT_TYPE_LABELS[contentType]}
          </p>
        </div>
      </div>

      <div
        className="min-h-[220px] bg-[url('data:image/svg+xml,%3Csvg width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.03%27%3E%3Cpath d=%27M0 40L40 0H20L0 20M40 40V20L20 40%27/%3E%3C/g%3E%3C/svg%3E')] bg-[#0b141a] p-3"
      >
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 text-sm text-white shadow">
          {contentType === "image" || contentType === "sticker" ? (
            primaryMedia?.previewUrl ? (
              <img
                src={primaryMedia.previewUrl}
                alt={primaryMedia.name}
                className="mb-1 max-h-48 w-full rounded object-cover"
              />
            ) : (
              <p className="mb-1 text-xs text-white/60">[Sin imagen asociada]</p>
            )
          ) : null}

          {contentType === "video" ? (
            primaryMedia?.previewUrl ? (
              <video
                src={primaryMedia.previewUrl}
                controls
                className="mb-1 max-h-48 w-full rounded"
              />
            ) : (
              <p className="mb-1 text-xs text-white/60">[Sin video asociado]</p>
            )
          ) : null}

          {contentType === "audio" ? (
            primaryMedia?.previewUrl ? (
              <audio src={primaryMedia.previewUrl} controls className="mb-1 w-full" />
            ) : (
              <p className="mb-1 text-xs text-white/60">[Sin audio asociado]</p>
            )
          ) : null}

          {contentType === "document" ? (
            <div className="mb-1 flex items-center gap-2 rounded bg-black/20 px-2 py-2">
              <span className="text-lg">📄</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {primaryMedia?.name || "Documento"}
                </p>
                <p className="text-[10px] text-white/50">
                  {primaryMedia?.mime_type || "archivo"}
                </p>
              </div>
            </div>
          ) : null}

          {contentType === "location" && location ? (
            <div className="mb-1 rounded bg-black/20 px-2 py-2 text-xs">
              <p className="font-medium">📍 {location.name || "Ubicación"}</p>
              {location.address ? (
                <p className="text-white/70">{location.address}</p>
              ) : null}
              <p className="mt-1 font-mono text-[10px] text-white/50">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
            </div>
          ) : null}

          {contentType === "interactive" && interactive.header ? (
            <p className="mb-1 text-xs font-semibold text-white/90">
              {interactive.header}
            </p>
          ) : null}

          {text ? (
            <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
          ) : contentType === "text" || contentType === "interactive" ? (
            <p className="text-white/40">—</p>
          ) : null}

          {contentType === "interactive" && interactive.footer ? (
            <p className="mt-1 text-[11px] text-white/50">{interactive.footer}</p>
          ) : null}

          <p className="mt-1 text-right text-[10px] text-white/40">12:00 ✓✓</p>
        </div>

        {contentType === "interactive" ? (
          <div className="ml-auto mt-1 max-w-[85%] space-y-1">
            {interactive.kind === "list" ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1f2c34] px-3 py-2 text-sm text-[#53bdeb]"
              >
                ≡ {interactive.listButtonText || "Ver opciones"}
              </button>
            ) : (
              buttons.slice(0, 3).map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  className="w-full rounded-lg border border-white/10 bg-[#1f2c34] px-3 py-2 text-sm text-[#53bdeb]"
                >
                  {btn.title || "(sin título)"}
                </button>
              ))
            )}
            {interactive.kind === "list" &&
            (interactive.sections?.[0]?.rows?.length ?? 0) > 0 ? (
              <div className="rounded-lg border border-white/10 bg-[#1f2c34] p-2 text-xs text-white/80">
                <p className="mb-1 font-medium text-white/50">
                  {interactive.sections?.[0]?.title || "Lista"}
                </p>
                {sortedButtons(
                  (interactive.sections?.[0]?.rows ?? []).map((row) => ({
                    id: row.id,
                    title: row.title,
                    sort_order: row.sort_order,
                  })),
                ).map((row) => (
                  <p key={row.id} className="border-t border-white/5 py-1.5">
                    {row.title}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
