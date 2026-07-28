"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import {
  BOT_MEDIA_TYPES,
  BOT_MEDIA_TYPE_LABELS,
  BOT_VARIABLE_CATALOG,
  extractVariablesFromBody,
  previewMessageBody,
  type BotCategory,
  type BotMediaAsset,
  type BotMediaType,
  type BotMessageDetail,
  type BotMessageListItem,
  type BotMessageStatus,
  type BotMessageVersion,
} from "@/lib/bot-cms/types";

type MainTab = "messages" | "media" | "categories";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function insertAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
) {
  return {
    next: value.slice(0, selectionStart) + insert + value.slice(selectionEnd),
    caret: selectionStart + insert.length,
  };
}

export function BotManagerView() {
  const secureFetch = useSecureFetch();
  const [tab, setTab] = useState<MainTab>("messages");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<BotCategory[]>([]);
  const [messages, setMessages] = useState<BotMessageListItem[]>([]);
  const [media, setMedia] = useState<BotMediaAsset[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BotMessageDetail | null>(null);
  const [versions, setVersions] = useState<BotMessageVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editStatus, setEditStatus] = useState<BotMessageStatus>("DRAFT");
  const [editMediaIds, setEditMediaIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const [mediaTypeFilter, setMediaTypeFilter] = useState("");
  const [mediaQ, setMediaQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);

  const [catCode, setCatCode] = useState("");
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  const livePreview = useMemo(
    () => previewMessageBody(editBody),
    [editBody],
  );
  const liveVars = useMemo(
    () => extractVariablesFromBody(editBody),
    [editBody],
  );

  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/admin/bot/categories", {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Error al cargar categorías");
    }
    setCategories(payload.data);
  }, []);

  const loadMessages = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (tagFilter.trim()) params.set("tag", tagFilter.trim());
    const response = await fetch(
      `/api/admin/bot/messages?${params.toString()}`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Error al cargar mensajes");
    }
    setMessages(payload.data);
  }, [q, statusFilter, categoryFilter, tagFilter]);

  const loadMedia = useCallback(async () => {
    const params = new URLSearchParams();
    if (mediaQ.trim()) params.set("q", mediaQ.trim());
    if (mediaTypeFilter) params.set("type", mediaTypeFilter);
    if (tagFilter.trim()) params.set("tag", tagFilter.trim());
    const response = await fetch(`/api/admin/bot/media?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Error al cargar multimedia");
    }
    setMedia(payload.data);
  }, [mediaQ, mediaTypeFilter, tagFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCategories(), loadMessages(), loadMedia()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de carga");
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadMessages, loadMedia]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/bot/messages/${id}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cargar el mensaje");
      return;
    }
    const data = payload.data as BotMessageDetail;
    setDetail(data);
    setEditName(data.name);
    setEditBody(data.body);
    setEditCategoryId(data.category_id ?? "");
    setEditStatus(data.status);
    setEditMediaIds(data.mediaIds);
  }, []);

  const loadVersions = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/bot/messages/${id}/versions`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cargar historial");
      return;
    }
    setVersions(payload.data);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setVersions([]);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleCreateMessage(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await secureFetch("/api/admin/bot/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          body: "",
          category_id: categoryFilter || null,
          status: "DRAFT",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear");
        return;
      }
      setCreateOpen(false);
      setNewCode("");
      setNewName("");
      await loadMessages();
      setSelectedId(payload.data.id);
    } catch {
      setError("Error al crear mensaje");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMessage() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/messages/${selectedId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            body: editBody,
            category_id: editCategoryId || null,
            status: editStatus,
            mediaIds: editMediaIds,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo guardar");
        return;
      }
      setError(null);
      await loadMessages();
      await loadDetail(selectedId);
      if (showVersions) await loadVersions(selectedId);
    } catch {
      setError("Error al guardar mensaje");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!detail) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/messages/${detail.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !detail.is_active }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo cambiar estado");
        return;
      }
      await loadMessages();
      await loadDetail(detail.id);
    } catch {
      setError("Error al activar/desactivar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMessage() {
    if (!detail) return;
    if (!window.confirm(`¿Eliminar mensaje ${detail.code}?`)) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/messages/${detail.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar");
        return;
      }
      setSelectedId(null);
      await loadMessages();
    } catch {
      setError("Error al eliminar");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!selectedId) return;
    if (!window.confirm("¿Restaurar esta versión? Se creará una nueva versión."))
      return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/messages/${selectedId}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo restaurar");
        return;
      }
      await loadMessages();
      await loadDetail(selectedId);
      await loadVersions(selectedId);
    } catch {
      setError("Error al restaurar");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    try {
      const response = await secureFetch("/api/admin/bot/media", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo subir");
        return;
      }
      setUploadOpen(false);
      form.reset();
      await loadMedia();
    } catch {
      setError("Error al subir multimedia");
    } finally {
      setSaving(false);
    }
  }

  async function handleUrlMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const tags = String(form.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const response = await secureFetch("/api/admin/bot/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description") || null,
          media_type: form.get("media_type"),
          external_url: form.get("external_url"),
          tags,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo registrar URL");
        return;
      }
      setUrlOpen(false);
      event.currentTarget.reset();
      await loadMedia();
    } catch {
      setError("Error al registrar multimedia");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleMediaStatus(asset: BotMediaAsset) {
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/bot/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: asset.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo actualizar");
        return;
      }
      await loadMedia();
    } catch {
      setError("Error al actualizar multimedia");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedia(asset: BotMediaAsset) {
    if (!window.confirm(`¿Eliminar ${asset.name}?`)) return;
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/bot/media/${asset.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar");
        return;
      }
      await loadMedia();
    } catch {
      setError("Error al eliminar multimedia");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await secureFetch("/api/admin/bot/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: catCode,
          name: catName,
          description: catDescription || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear categoría");
        return;
      }
      setCatCode("");
      setCatName("");
      setCatDescription("");
      await loadCategories();
    } catch {
      setError("Error al crear categoría");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCategory(cat: BotCategory) {
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/bot/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo actualizar");
        return;
      }
      await loadCategories();
    } catch {
      setError("Error al actualizar categoría");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(cat: BotCategory) {
    if (!window.confirm(`¿Eliminar categoría ${cat.name}?`)) return;
    setSaving(true);
    try {
      const response = await secureFetch(`/api/admin/bot/categories/${cat.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar");
        return;
      }
      await loadCategories();
    } catch {
      setError("Error al eliminar categoría");
    } finally {
      setSaving(false);
    }
  }

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    const el = document.getElementById(
      "bot-message-body",
    ) as HTMLTextAreaElement | null;
    if (!el) {
      setEditBody((prev) => prev + token);
      return;
    }
    const { next, caret } = insertAtCursor(
      editBody,
      el.selectionStart,
      el.selectionEnd,
      token,
    );
    setEditBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function toggleMediaAssociation(mediaId: string) {
    setEditMediaIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId],
    );
  }

  const mediaByType = useMemo(() => {
    const map = new Map<BotMediaType, BotMediaAsset[]>();
    for (const type of BOT_MEDIA_TYPES) map.set(type, []);
    for (const asset of media) {
      map.get(asset.media_type)?.push(asset);
    }
    return map;
  }, [media]);

  return (
    <div>
      <PageHeader
        title="Bot Manager CMS"
        description="Administración de mensajes, multimedia y categorías del bot. WhatXia Basic aún no consume esta configuración."
        actions={
          tab === "messages" ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Nuevo mensaje
            </button>
          ) : tab === "media" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUrlOpen(true)}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
              >
                Registrar URL
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
              >
                Subir archivo
              </button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["messages", "Mensajes"],
            ["media", "Multimedia"],
            ["categories", "Categorías"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === key
                ? "bg-brand text-brand-ink font-semibold"
                : "border border-border bg-surface-elevated text-muted-strong"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando Bot Manager…</p>
      ) : null}

      {createOpen ? (
        <form
          onSubmit={handleCreateMessage}
          className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-elevated p-4 md:grid-cols-3"
        >
          <input
            required
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="ID único (WELCOME_MESSAGE)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          />
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {uploadOpen ? (
        <form
          onSubmit={handleUploadMedia}
          className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-elevated p-4 md:grid-cols-2"
        >
          <input
            required
            name="name"
            placeholder="Nombre"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            name="media_type"
            defaultValue="image"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {BOT_MEDIA_TYPES.map((type) => (
              <option key={type} value={type}>
                {BOT_MEDIA_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            name="description"
            placeholder="Descripción"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="tags"
            placeholder="Etiquetas (coma)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            required
            type="file"
            name="file"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Subir
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {urlOpen ? (
        <form
          onSubmit={handleUrlMedia}
          className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-elevated p-4 md:grid-cols-2"
        >
          <input
            required
            name="name"
            placeholder="Nombre"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            name="media_type"
            defaultValue="image"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {BOT_MEDIA_TYPES.map((type) => (
              <option key={type} value={type}>
                {BOT_MEDIA_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            required
            name="external_url"
            placeholder="URL pública"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="description"
            placeholder="Descripción"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="tags"
            placeholder="Etiquetas (coma)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => setUrlOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {tab === "messages" ? (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="rounded-xl border border-border bg-surface-elevated p-3">
            <div className="mb-3 grid gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar ID, nombre, texto…"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="DRAFT">BORRADOR</option>
                  <option value="PUBLISHED">PUBLICADO</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                >
                  <option value="">Todas categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder="Etiqueta multimedia"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <ul className="max-h-[70vh] space-y-1 overflow-auto">
              {messages.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      selectedId === item.id
                        ? "bg-brand/15 border border-brand/40"
                        : "hover:bg-surface-hover border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-brand">
                        {item.code}
                      </span>
                      <StatusBadge
                        label={
                          item.status === "PUBLISHED" ? "PUBLICADO" : "BORRADOR"
                        }
                        tone={item.status === "PUBLISHED" ? "success" : "warning"}
                      />
                    </div>
                    <p className="mt-0.5 text-sm text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.categoryName || "Sin categoría"} · v{item.version}
                      {item.mediaCount > 0 ? ` · ${item.mediaCount} media` : ""}
                    </p>
                  </button>
                </li>
              ))}
              {messages.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-muted">
                  Sin mensajes
                </li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            {!selected || !detail ? (
              <p className="text-sm text-muted">
                Selecciona un mensaje para editarlo. Solo los PUBLICADOS podrán
                usarse luego por WhatXia Basic.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-brand">{detail.code}</p>
                    <p className="text-xs text-muted">
                      v{detail.version} · Actualizado {formatDate(detail.updated_at)}
                      {detail.updated_by_email
                        ? ` · ${detail.updated_by_email}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowVersions((v) => !v);
                        if (!showVersions && selectedId) {
                          await loadVersions(selectedId);
                        }
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    >
                      Versiones
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive()}
                      disabled={saving}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    >
                      {detail.is_active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMessage()}
                      disabled={saving}
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveMessage()}
                      disabled={saving}
                      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted">Nombre</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted">Categoría</span>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <option value="">Sin categoría</option>
                      {categories
                        .filter((c) => c.is_active)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted">Estado</span>
                    <select
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as BotMessageStatus)
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <option value="DRAFT">BORRADOR</option>
                      <option value="PUBLISHED">PUBLICADO</option>
                    </select>
                  </label>
                  <div className="grid gap-1 text-sm">
                    <span className="text-muted">Variables detectadas</span>
                    <div className="flex min-h-[42px] flex-wrap gap-1 rounded-lg border border-border bg-background px-2 py-2">
                      {liveVars.length === 0 ? (
                        <span className="text-xs text-muted">Ninguna</span>
                      ) : (
                        liveVars.map((v) => (
                          <StatusBadge key={v} label={`{{${v}}}`} tone="info" />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm text-muted">Insertar variable</p>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {BOT_VARIABLE_CATALOG.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => insertVariable(item.key)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono hover:border-brand/50"
                      >
                        {`{{${item.key}}}`}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="bot-message-body"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Texto del mensaje…"
                  />
                </div>

                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                    Vista previa
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {livePreview || "—"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Multimedia asociada
                  </p>
                  <div className="space-y-3">
                    {BOT_MEDIA_TYPES.map((type) => {
                      const items = mediaByType.get(type) ?? [];
                      if (items.length === 0) return null;
                      return (
                        <div key={type}>
                          <p className="mb-1 text-xs text-muted">
                            {BOT_MEDIA_TYPE_LABELS[type]}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {items.map((asset) => {
                              const checked = editMediaIds.includes(asset.id);
                              return (
                                <label
                                  key={asset.id}
                                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                                    checked
                                      ? "border-brand/50 bg-brand/10"
                                      : "border-border bg-background"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleMediaAssociation(asset.id)
                                    }
                                  />
                                  <span>{asset.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {media.length === 0 ? (
                      <p className="text-xs text-muted">
                        No hay recursos en la biblioteca. Sube multimedia en la
                        pestaña correspondiente.
                      </p>
                    ) : null}
                  </div>
                </div>

                {showVersions ? (
                  <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-medium">Historial de versiones</p>
                    <ul className="max-h-80 space-y-2 overflow-auto">
                      {versions.map((version, index) => {
                        const newer = versions[index - 1];
                        return (
                          <li
                            key={version.id}
                            className="rounded-lg border border-border bg-background p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold">
                                  v{version.version}
                                </span>
                                <span className="text-muted">
                                  {" "}
                                  · {formatDate(version.created_at)}
                                  {version.changed_by_email
                                    ? ` · ${version.changed_by_email}`
                                    : ""}
                                </span>
                                {version.change_note ? (
                                  <span className="text-muted">
                                    {" "}
                                    · {version.change_note}
                                  </span>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleRestore(version.id)}
                                className="rounded-md border border-border px-2 py-1 text-xs"
                              >
                                Restaurar
                              </button>
                            </div>
                            {newer ? (
                              <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                                <div>
                                  <p className="text-muted">Valor anterior</p>
                                  <pre className="mt-1 whitespace-pre-wrap rounded border border-border/60 p-2">
                                    {version.body}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-muted">Valor nuevo</p>
                                  <pre className="mt-1 whitespace-pre-wrap rounded border border-border/60 p-2">
                                    {newer.body}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <pre className="mt-2 whitespace-pre-wrap rounded border border-border/60 p-2 text-xs">
                                {version.body}
                              </pre>
                            )}
                          </li>
                        );
                      })}
                      {versions.length === 0 ? (
                        <li className="text-xs text-muted">Sin historial</li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={mediaQ}
              onChange={(e) => setMediaQ(e.target.value)}
              placeholder="Buscar por nombre, descripción, etiqueta…"
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
            />
            <select
              value={mediaTypeFilter}
              onChange={(e) => setMediaTypeFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {BOT_MEDIA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BOT_MEDIA_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((asset) => (
              <article
                key={asset.id}
                className="rounded-xl border border-border bg-surface-elevated p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted">
                      {BOT_MEDIA_TYPE_LABELS[asset.media_type]} ·{" "}
                      {formatBytes(asset.size_bytes)}
                    </p>
                  </div>
                  <StatusBadge
                    label={asset.status}
                    tone={asset.status === "ACTIVE" ? "success" : "neutral"}
                  />
                </div>

                <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                  {asset.previewUrl &&
                  (asset.media_type === "image" ||
                    asset.media_type === "gif" ||
                    asset.media_type === "sticker") ? (
                    <img
                      src={asset.previewUrl}
                      alt={asset.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : asset.previewUrl && asset.media_type === "video" ? (
                    <video
                      src={asset.previewUrl}
                      className="max-h-full max-w-full"
                      controls
                    />
                  ) : asset.previewUrl && asset.media_type === "audio" ? (
                    <audio src={asset.previewUrl} controls className="w-full" />
                  ) : asset.previewUrl ? (
                    <a
                      href={asset.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand underline"
                    >
                      Abrir / descargar
                    </a>
                  ) : (
                    <span className="text-xs text-muted">Sin vista previa</span>
                  )}
                </div>

                {asset.description ? (
                  <p className="mb-2 text-xs text-muted">{asset.description}</p>
                ) : null}
                <div className="mb-2 flex flex-wrap gap-1">
                  {asset.tags.map((tag) => (
                    <StatusBadge key={tag} label={tag} tone="info" />
                  ))}
                </div>
                <p className="mb-2 text-[11px] text-muted">
                  {formatDate(asset.created_at)}
                  {asset.created_by_email ? ` · ${asset.created_by_email}` : ""}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleToggleMediaStatus(asset)}
                    className="rounded-md border border-border px-2 py-1 text-xs"
                  >
                    {asset.status === "ACTIVE" ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleDeleteMedia(asset)}
                    className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
          {media.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Biblioteca vacía. Sube un archivo o registra una URL.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "categories" ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateCategory}
            className="h-fit space-y-3 rounded-xl border border-border bg-surface-elevated p-4"
          >
            <p className="text-sm font-medium">Nueva categoría</p>
            <input
              required
              value={catCode}
              onChange={(e) => setCatCode(e.target.value.toUpperCase())}
              placeholder="Código (BIENVENIDA)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            />
            <input
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nombre"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              placeholder="Descripción"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink"
            >
              Crear categoría
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-brand">
                      {cat.code}
                    </td>
                    <td className="px-3 py-2">
                      <p>{cat.name}</p>
                      {cat.description ? (
                        <p className="text-xs text-muted">{cat.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={cat.is_active ? "ACTIVA" : "INACTIVA"}
                        tone={cat.is_active ? "success" : "neutral"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleToggleCategory(cat)}
                          className="rounded-md border border-border px-2 py-1 text-xs"
                        >
                          {cat.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleDeleteCategory(cat)}
                          className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
