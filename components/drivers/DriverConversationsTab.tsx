"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  ConversationHistoryDetail,
  ConversationHistoryList,
  ConversationHistoryListItem,
} from "@/lib/conversations/history";

type ListResponse =
  | { ok: true; data: ConversationHistoryList }
  | { ok: false; error: string };

type DetailResponse =
  | { ok: true; data: ConversationHistoryDetail }
  | { ok: false; error: string };

export function DriverConversationsTab({ driverId }: { driverId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<ConversationHistoryList | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationHistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/drivers/${driverId}/conversations`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ListResponse;
      if (!response.ok || !payload.ok) {
        setList(null);
        setError(
          !payload.ok && "error" in payload
            ? payload.error
            : "No se pudo cargar el historial",
        );
        return;
      }
      setList(payload.data);
    } catch {
      setError("Error de conexión");
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadList();
    setSelectedId(null);
    setDetail(null);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(
          `/api/conversations/history/${selectedId}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as DetailResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setDetail(null);
          setDetailError(
            !payload.ok && "error" in payload
              ? payload.error
              : "No se pudo abrir la conversación",
          );
          return;
        }
        setDetail(payload.data);
      } catch {
        if (!cancelled) {
          setDetail(null);
          setDetailError("Error de conexión");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-surface-hover/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        {error}
        <button
          type="button"
          onClick={() => void loadList()}
          className="mt-3 block rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-strong hover:bg-surface-hover"
          >
            ← Volver al listado
          </button>
          {detail ? (
            <Link
              href={detail.inspectorPath}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Abrir en Inspector
            </Link>
          ) : null}
        </div>

        {detailLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-surface-hover/50"
              />
            ))}
          </div>
        ) : null}

        {detailError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {detailError}
          </div>
        ) : null}

        {detail && !detailLoading ? (
          <>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                Servicio #{detail.shortId}
              </p>
              <p className="mt-1 text-xs text-muted">
                {detail.header.summaryLine}
              </p>
              {detail.header.passengerName ? (
                <p className="mt-1 text-xs text-muted">
                  Pasajero: {detail.header.passengerName}
                </p>
              ) : null}
            </div>

            <ol className="space-y-3">
              {detail.timeline.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border-subtle bg-surface px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={
                        item.kind === "free_message"
                          ? "Mensaje libre"
                          : "Evento"
                      }
                      tone={item.kind === "free_message" ? "brand" : "info"}
                    />
                    <span className="text-[11px] text-muted">
                      {item.dateLabel} · {item.timeLabel}
                    </span>
                    {item.actorLabel ? (
                      <span className="text-[11px] font-medium text-muted-strong">
                        {item.actorLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {item.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-strong">
                      {item.body}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>

            {detail.timeline.length === 0 ? (
              <p className="text-sm text-muted">
                Sin eventos ni mensajes libres para este servicio.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  const items = list?.items ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Historial por servicio. Solo mensajes libres pasajero↔conductor y eventos
        del sistema con marca de tiempo real.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          Este conductor aún no tiene servicios con historial consultable.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ConversationRow
              key={item.conversationId}
              item={item}
              onOpen={() => setSelectedId(item.conversationId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({
  item,
  onOpen,
}: {
  item: ConversationHistoryListItem;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-surface-hover/60"
      >
        <p className="text-sm font-medium text-foreground">
          {item.summaryLine}
        </p>
        <p className="mt-1 text-xs text-muted">
          {item.passengerName
            ? `Pasajero: ${item.passengerName}`
            : "Pasajero no disponible"}
          {item.hasFreeTextMessages
            ? ` · ${item.freeTextCount} mensaje(s) libre(s)`
            : ""}
        </p>
      </button>
    </li>
  );
}
