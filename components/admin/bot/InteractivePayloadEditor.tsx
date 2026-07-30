"use client";

import {
  emptyInteractivePayload,
  type BotInteractivePayload,
  type WaButtonItem,
  type WaInteractiveKind,
  type WaListRow,
} from "@/lib/bot-cms/types";

type Props = {
  value: BotInteractivePayload;
  onChange: (next: BotInteractivePayload) => void;
};

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function sortItems<T extends { sort_order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function reindexButtons(items: WaButtonItem[]): WaButtonItem[] {
  return sortItems(items).map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

function reindexRows(items: WaListRow[]): WaListRow[] {
  return sortItems(items).map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

export function InteractivePayloadEditor({ value, onChange }: Props) {
  const kind = value.kind ?? "buttons";

  function setKind(next: WaInteractiveKind) {
    onChange({
      ...emptyInteractivePayload(next),
      header: value.header,
      footer: value.footer,
      buttons: value.buttons,
      options: value.options,
      sections: value.sections,
      listButtonText: value.listButtonText,
      kind: next,
    });
  }

  function updateButtons(items: WaButtonItem[]) {
    onChange({ ...value, buttons: reindexButtons(items) });
  }

  function updateOptions(items: WaButtonItem[]) {
    onChange({ ...value, options: reindexButtons(items) });
  }

  function updateRows(rows: WaListRow[]) {
    const section = value.sections?.[0] ?? { title: "Opciones", rows: [] };
    onChange({
      ...value,
      sections: [{ ...section, rows: reindexRows(rows) }],
    });
  }

  function moveItem<T extends { sort_order: number }>(
    items: T[],
    index: number,
    direction: -1 | 1,
  ): T[] {
    const sorted = sortItems(items);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return sorted;
    const copy = [...sorted];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    return copy.map((item, i) => ({ ...item, sort_order: i }));
  }

  const buttonItems =
    kind === "options"
      ? sortItems(value.options ?? [])
      : sortItems(value.buttons ?? []);
  const listRows = sortItems(value.sections?.[0]?.rows ?? []);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">
        Componentes WhatsApp
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["buttons", "Botones"],
            ["list", "Lista"],
            ["options", "Opciones"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={`rounded-md px-2.5 py-1 text-xs ${
              kind === key
                ? "bg-brand font-semibold text-brand-ink"
                : "border border-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Encabezado</span>
          <input
            value={value.header ?? ""}
            onChange={(e) => onChange({ ...value, header: e.target.value })}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
            maxLength={60}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Pie</span>
          <input
            value={value.footer ?? ""}
            onChange={(e) => onChange({ ...value, footer: e.target.value })}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
            maxLength={60}
          />
        </label>
      </div>

      {kind === "list" ? (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Texto del botón de lista</span>
            <input
              value={value.listButtonText ?? "Ver opciones"}
              onChange={(e) =>
                onChange({ ...value, listButtonText: e.target.value })
              }
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
              maxLength={20}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Título de sección</span>
            <input
              value={value.sections?.[0]?.title ?? "Opciones"}
              onChange={(e) =>
                onChange({
                  ...value,
                  sections: [
                    {
                      title: e.target.value,
                      rows: value.sections?.[0]?.rows ?? [],
                    },
                  ],
                })
              }
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
            />
          </label>

          <div className="space-y-2">
            {listRows.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border border-border p-2 md:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  value={row.title}
                  onChange={(e) => {
                    const next = [...listRows];
                    next[index] = { ...row, title: e.target.value };
                    updateRows(next);
                  }}
                  placeholder="Título"
                  className="rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-sm"
                  maxLength={24}
                />
                <input
                  value={row.description ?? ""}
                  onChange={(e) => {
                    const next = [...listRows];
                    next[index] = { ...row, description: e.target.value };
                    updateRows(next);
                  }}
                  placeholder="Descripción"
                  className="rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-sm"
                  maxLength={72}
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateRows(moveItem(listRows, index, -1))}
                    className="rounded border border-border px-2 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRows(moveItem(listRows, index, 1))}
                    className="rounded border border-border px-2 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateRows(listRows.filter((_, i) => i !== index))
                    }
                    className="rounded border border-danger/40 px-2 text-xs text-danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateRows([
                  ...listRows,
                  {
                    id: newId("row"),
                    title: "",
                    description: "",
                    sort_order: listRows.length,
                  },
                ])
              }
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              + Fila
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {kind === "buttons"
              ? "Máximo 3 botones de respuesta rápida (WhatsApp)."
              : "Opciones ordenables (alias de botones)."}
          </p>
          {buttonItems.map((btn, index) => (
            <div
              key={btn.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
            >
              <input
                value={btn.id}
                onChange={(e) => {
                  const next = [...buttonItems];
                  next[index] = { ...btn, id: e.target.value };
                  if (kind === "options") updateOptions(next);
                  else updateButtons(next);
                }}
                placeholder="id"
                className="w-28 rounded-md border border-border bg-surface-elevated px-2 py-1.5 font-mono text-xs"
              />
              <input
                value={btn.title}
                onChange={(e) => {
                  const next = [...buttonItems];
                  next[index] = { ...btn, title: e.target.value };
                  if (kind === "options") updateOptions(next);
                  else updateButtons(next);
                }}
                placeholder="Título"
                className="min-w-[140px] flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-sm"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => {
                  const moved = moveItem(buttonItems, index, -1);
                  if (kind === "options") updateOptions(moved);
                  else updateButtons(moved);
                }}
                className="rounded border border-border px-2 text-xs"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => {
                  const moved = moveItem(buttonItems, index, 1);
                  if (kind === "options") updateOptions(moved);
                  else updateButtons(moved);
                }}
                className="rounded border border-border px-2 text-xs"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = buttonItems.filter((_, i) => i !== index);
                  if (kind === "options") updateOptions(next);
                  else updateButtons(next);
                }}
                className="rounded border border-danger/40 px-2 text-xs text-danger"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={kind === "buttons" && buttonItems.length >= 3}
            onClick={() => {
              const next = [
                ...buttonItems,
                {
                  id: newId("btn"),
                  title: "",
                  sort_order: buttonItems.length,
                },
              ];
              if (kind === "options") updateOptions(next);
              else updateButtons(next);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            + {kind === "options" ? "Opción" : "Botón"}
          </button>
        </div>
      )}
    </div>
  );
}
