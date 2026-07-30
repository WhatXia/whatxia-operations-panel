"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { InteractivePayloadEditor } from "@/components/admin/bot/InteractivePayloadEditor";
import { WhatsAppPreview } from "@/components/admin/bot/WhatsAppPreview";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSecureFetch } from "@/components/security/ReauthProvider";
import {
  BOT_AUDIENCE_LABELS,
  BOT_EDGE_TRIGGER_TYPES,
  DRIVER_STAGES,
  PASSENGER_STAGES,
  stagesForAudience,
  type BotAudience,
  type BotConversationEdge,
  type BotConversationNode,
  type BotConversationTreeDetail,
  type BotConversationTreeListItem,
  type BotConversationTreeVersion,
  type BotEdgeTriggerType,
} from "@/lib/bot-cms/conversation-types";
import {
  BOT_CONTENT_TYPES,
  BOT_CONTENT_TYPE_LABELS,
  BOT_ENVIRONMENT_LABELS,
  BOT_MEDIA_TYPE_LABELS,
  BOT_VARIABLE_CATALOG,
  emptyInteractivePayload,
  extractVariablesFromBody,
  type BotContentType,
  type BotInteractivePayload,
  type BotLocationPayload,
  type BotMediaAsset,
  type BotMessageStatus,
} from "@/lib/bot-cms/types";

const QUICK_EMOJIS = ["👋", "🚗", "📍", "✅", "❌", "⚠️", "💰", "⏱️", "🎉", "📱"];

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

type Props = {
  media: BotMediaAsset[];
};

export function ConversationCmsView({ media }: Props) {
  const secureFetch = useSecureFetch();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [trees, setTrees] = useState<BotConversationTreeListItem[]>([]);
  const [audienceFilter, setAudienceFilter] = useState<"" | BotAudience>("");
  const [treeSearch, setTreeSearch] = useState("");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BotConversationTreeDetail | null>(null);

  const [nodeSearch, setNodeSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [versions, setVersions] = useState<BotConversationTreeVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const [editName, setEditName] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editContentType, setEditContentType] =
    useState<BotContentType>("text");
  const [editInteractive, setEditInteractive] = useState<BotInteractivePayload>(
    emptyInteractivePayload(),
  );
  const [editLocation, setEditLocation] = useState<BotLocationPayload>({
    latitude: 4.711,
    longitude: -74.0721,
    name: "",
    address: "",
  });
  const [editMediaIds, setEditMediaIds] = useState<string[]>([]);
  const [editMessageCode, setEditMessageCode] = useState("");
  const [editIsEntry, setEditIsEntry] = useState(false);

  const [newNodeOpen, setNewNodeOpen] = useState(false);
  const [newNodeCode, setNewNodeCode] = useState("");
  const [newNodeName, setNewNodeName] = useState("");

  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeTriggerType, setEdgeTriggerType] =
    useState<BotEdgeTriggerType>("button");
  const [edgeTriggerValue, setEdgeTriggerValue] = useState("");

  const selectedNode = useMemo(
    () => detail?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [detail, selectedNodeId],
  );

  const filteredNodes = useMemo(() => {
    if (!detail) return [];
    const q = nodeSearch.trim().toLowerCase();
    let nodes = [...detail.nodes].sort((a, b) => a.sort_order - b.sort_order);
    if (q) {
      nodes = nodes.filter((n) =>
        [n.code, n.name, n.stage ?? "", n.body]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return nodes;
  }, [detail, nodeSearch]);

  const outgoingEdges = useMemo(() => {
    if (!detail || !selectedNodeId) return [];
    return detail.edges.filter((e) => e.from_node_id === selectedNodeId);
  }, [detail, selectedNodeId]);

  const previewMedia = useMemo(
    () => media.filter((m) => editMediaIds.includes(m.id)),
    [media, editMediaIds],
  );

  const loadTrees = useCallback(async () => {
    const params = new URLSearchParams();
    if (audienceFilter) params.set("audience", audienceFilter);
    if (treeSearch.trim()) params.set("q", treeSearch.trim());
    const response = await fetch(
      `/api/admin/bot/conversations?${params.toString()}`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Error al cargar árboles");
    }
    setTrees(payload.data);
  }, [audienceFilter, treeSearch]);

  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/bot/conversations/${id}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cargar el árbol");
      return;
    }
    setDetail(payload.data as BotConversationTreeDetail);
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadTrees()
      .then(() => setError(null))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error de carga"),
      )
      .finally(() => setLoading(false));
  }, [loadTrees]);

  useEffect(() => {
    if (!selectedTreeId) {
      setDetail(null);
      setSelectedNodeId(null);
      return;
    }
    void loadDetail(selectedTreeId);
  }, [selectedTreeId, loadDetail]);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }
    setEditName(selectedNode.name);
    setEditStage(selectedNode.stage ?? "");
    setEditBody(selectedNode.body);
    setEditContentType(selectedNode.content_type);
    setEditInteractive(selectedNode.interactive_payload);
    setEditLocation(
      selectedNode.location_payload ?? {
        latitude: 4.711,
        longitude: -74.0721,
        name: "",
        address: "",
      },
    );
    setEditMediaIds(selectedNode.mediaIds);
    setEditMessageCode(selectedNode.message_code ?? "");
    setEditIsEntry(selectedNode.is_entry);
  }, [selectedNode]);

  function applyNodeToForm(node: BotConversationNode) {
    setSelectedNodeId(node.id);
  }

  async function handlePublish() {
    if (!selectedTreeId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publish: true }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo publicar");
        return;
      }
      setError(null);
      await loadTrees();
      await loadDetail(selectedTreeId);
    } catch {
      setError("Error al publicar");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    if (!selectedTreeId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DRAFT" as BotMessageStatus }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo despublicar");
        return;
      }
      await loadTrees();
      await loadDetail(selectedTreeId);
    } catch {
      setError("Error al despublicar");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNode() {
    if (!selectedTreeId || !selectedNodeId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/nodes/${selectedNodeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            stage: editStage || null,
            body: editBody,
            content_type: editContentType,
            interactive_payload: editInteractive,
            location_payload:
              editContentType === "location" ? editLocation : null,
            mediaIds: editMediaIds,
            message_code: editMessageCode || null,
            is_entry: editIsEntry,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo guardar el nodo");
        return;
      }
      setError(null);
      await loadDetail(selectedTreeId);
      await loadTrees();
    } catch {
      setError("Error al guardar nodo");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNode(event: FormEvent) {
    event.preventDefault();
    if (!selectedTreeId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/nodes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: newNodeCode,
            name: newNodeName,
            body: "",
            content_type: "text",
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear nodo");
        return;
      }
      setNewNodeOpen(false);
      setNewNodeCode("");
      setNewNodeName("");
      await loadDetail(selectedTreeId);
      setSelectedNodeId(payload.data.id);
    } catch {
      setError("Error al crear nodo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNode() {
    if (!selectedTreeId || !selectedNodeId || !selectedNode) return;
    if (!window.confirm(`¿Eliminar nodo ${selectedNode.code}?`)) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/nodes/${selectedNodeId}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar");
        return;
      }
      setSelectedNodeId(null);
      await loadDetail(selectedTreeId);
    } catch {
      setError("Error al eliminar nodo");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddEdge(event: FormEvent) {
    event.preventDefault();
    if (!selectedTreeId || !selectedNodeId || !edgeTo) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/edges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_node_id: selectedNodeId,
            to_node_id: edgeTo,
            label: edgeLabel,
            trigger_type: edgeTriggerType,
            trigger_value: edgeTriggerValue,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo crear conexión");
        return;
      }
      setEdgeTo("");
      setEdgeLabel("");
      setEdgeTriggerValue("");
      await loadDetail(selectedTreeId);
    } catch {
      setError("Error al crear conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEdge(edge: BotConversationEdge) {
    if (!selectedTreeId) return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/edges?edgeId=${edge.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error || "No se pudo eliminar conexión");
        return;
      }
      await loadDetail(selectedTreeId);
    } catch {
      setError("Error al eliminar conexión");
    } finally {
      setSaving(false);
    }
  }

  async function loadVersions() {
    if (!selectedTreeId) return;
    const response = await fetch(
      `/api/admin/bot/conversations/${selectedTreeId}/versions`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setError(payload.error || "No se pudo cargar historial");
      return;
    }
    setVersions(payload.data);
  }

  async function handleRestore(versionId: string) {
    if (!selectedTreeId) return;
    if (!window.confirm("¿Restaurar esta versión? Se creará una nueva versión en borrador."))
      return;
    setSaving(true);
    try {
      const response = await secureFetch(
        `/api/admin/bot/conversations/${selectedTreeId}/versions`,
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
      await loadDetail(selectedTreeId);
      await loadTrees();
      await loadVersions();
    } catch {
      setError("Error al restaurar");
    } finally {
      setSaving(false);
    }
  }

  function insertText(token: string) {
    setEditBody((prev) => prev + token);
  }

  const stageOptions = detail
    ? stagesForAudience(detail.audience)
    : PASSENGER_STAGES;

  const nodeById = useMemo(() => {
    const map = new Map<string, BotConversationNode>();
    for (const n of detail?.nodes ?? []) map.set(n.id, n);
    return map;
  }, [detail]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando conversaciones…</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[260px_240px_minmax(0,1fr)]">
        {/* Árboles */}
        <div className="rounded-xl border border-border bg-surface-elevated p-3">
          <p className="mb-2 text-sm font-medium">Árboles</p>
          <div className="mb-2 grid gap-2">
            <select
              value={audienceFilter}
              onChange={(e) =>
                setAudienceFilter(e.target.value as "" | BotAudience)
              }
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="">Usuarios y conductores</option>
              <option value="PASSENGER">Usuarios</option>
              <option value="DRIVER">Conductores</option>
            </select>
            <input
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Buscar árbol…"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <ul className="max-h-[70vh] space-y-1 overflow-auto">
            {trees.map((tree) => (
              <li key={tree.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTreeId(tree.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    selectedTreeId === tree.id
                      ? "border border-brand/40 bg-brand/15"
                      : "border border-transparent hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{tree.name}</span>
                    <StatusBadge
                      label={
                        tree.status === "PUBLISHED" ? "PUBLICADO" : "BORRADOR"
                      }
                      tone={tree.status === "PUBLISHED" ? "success" : "warning"}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {BOT_AUDIENCE_LABELS[tree.audience]} · {tree.nodeCount}{" "}
                    nodos · v{tree.version}
                  </p>
                </button>
              </li>
            ))}
            {trees.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted">
                Sin árboles. Aplica migración 010.
              </li>
            ) : null}
          </ul>
        </div>

        {/* Nodos del árbol */}
        <div className="rounded-xl border border-border bg-surface-elevated p-3">
          {!detail ? (
            <p className="text-sm text-muted">Selecciona un árbol</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Nodos</p>
                <button
                  type="button"
                  onClick={() => setNewNodeOpen(true)}
                  className="rounded-md border border-border px-2 py-1 text-xs"
                >
                  + Nodo
                </button>
              </div>
              <input
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                placeholder="Buscar mensaje / nodo…"
                className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {newNodeOpen ? (
                <form
                  onSubmit={handleCreateNode}
                  className="mb-2 space-y-2 rounded-lg border border-border p-2"
                >
                  <input
                    required
                    value={newNodeCode}
                    onChange={(e) =>
                      setNewNodeCode(e.target.value.toUpperCase())
                    }
                    placeholder="CÓDIGO"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                  />
                  <input
                    required
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-brand-ink"
                    >
                      Crear
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNodeOpen(false)}
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}
              <ul className="max-h-[65vh] space-y-1 overflow-auto">
                {filteredNodes.map((node) => {
                  const outs = detail.edges.filter(
                    (e) => e.from_node_id === node.id,
                  ).length;
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => applyNodeToForm(node)}
                        className={`w-full rounded-lg px-2.5 py-2 text-left ${
                          selectedNodeId === node.id
                            ? "border border-brand/40 bg-brand/15"
                            : "border border-transparent hover:bg-surface-hover"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {node.is_entry ? (
                            <span className="text-[10px] text-brand">●</span>
                          ) : null}
                          <span className="font-mono text-[11px] text-brand">
                            {node.code}
                          </span>
                        </div>
                        <p className="text-sm">{node.name}</p>
                        <p className="text-[11px] text-muted">
                          {node.stage || "—"} · {outs} salidas
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Editor + preview + conexiones */}
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          {!detail ? (
            <p className="text-sm text-muted">
              Elige un árbol de Usuarios o Conductores para navegar el flujo,
              editar nodos y ver conexiones.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-brand">{detail.code}</p>
                  <p className="text-sm font-medium">{detail.name}</p>
                  <p className="text-xs text-muted">
                    {BOT_AUDIENCE_LABELS[detail.audience]} ·{" "}
                    {BOT_ENVIRONMENT_LABELS[detail.environment]} · v
                    {detail.version}
                    {detail.updated_by_email
                      ? ` · ${detail.updated_by_email}`
                      : ""}{" "}
                    · {formatDate(detail.updated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setShowVersions((v) => !v);
                      if (!showVersions) await loadVersions();
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    Historial
                  </button>
                  {detail.status === "PUBLISHED" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleUnpublish()}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    >
                      Pasar a borrador
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handlePublish()}
                      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink"
                    >
                      Publicar
                    </button>
                  )}
                </div>
              </div>

              {/* Mapa de conexiones del árbol */}
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Árbol / conexiones
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => applyNodeToForm(node)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-xs ${
                        selectedNodeId === node.id
                          ? "border-brand bg-brand/15"
                          : "border-border"
                      }`}
                    >
                      <span className="font-mono text-brand">{node.code}</span>
                      <span className="ml-1 text-muted">→</span>
                      <span className="ml-1">
                        {detail.edges
                          .filter((e) => e.from_node_id === node.id)
                          .map((e) => nodeById.get(e.to_node_id)?.code)
                          .filter(Boolean)
                          .join(", ") || "∅"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {!selectedNode ? (
                <p className="text-sm text-muted">
                  Selecciona un nodo para editarlo.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm text-brand">
                        {selectedNode.code}
                      </p>
                      <p className="text-xs text-muted">
                        Variables:{" "}
                        {extractVariablesFromBody(editBody).join(", ") ||
                          "ninguna"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDeleteNode()}
                        className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger"
                      >
                        Eliminar nodo
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSaveNode()}
                        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink"
                      >
                        Guardar nodo
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
                      <span className="text-muted">Etapa / módulo</span>
                      <select
                        value={editStage}
                        onChange={(e) => setEditStage(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <option value="">Sin etapa</option>
                        {(detail.audience === "DRIVER"
                          ? DRIVER_STAGES
                          : stageOptions
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-muted">Tipo de contenido</span>
                      <select
                        value={editContentType}
                        onChange={(e) =>
                          setEditContentType(e.target.value as BotContentType)
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2"
                      >
                        {BOT_CONTENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {BOT_CONTENT_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-muted">
                        Código mensaje catálogo (opcional)
                      </span>
                      <input
                        value={editMessageCode}
                        onChange={(e) =>
                          setEditMessageCode(e.target.value.toUpperCase())
                        }
                        placeholder="WELCOME_MESSAGE"
                        className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={editIsEntry}
                        onChange={(e) => setEditIsEntry(e.target.checked)}
                      />
                      Nodo de entrada (root)
                    </label>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-muted">Emoji / variables</p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertText(emoji)}
                          className="rounded-md border border-border px-2 py-1 text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                      {BOT_VARIABLE_CATALOG.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => insertText(`{{${item.key}}}`)}
                          className="rounded-md border border-border px-2 py-1 font-mono text-xs"
                        >
                          {`{{${item.key}}}`}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Texto del nodo…"
                    />
                  </div>

                  {editContentType === "location" ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        type="number"
                        step="any"
                        value={editLocation.latitude}
                        onChange={(e) =>
                          setEditLocation((p) => ({
                            ...p,
                            latitude: Number(e.target.value),
                          }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Latitud"
                      />
                      <input
                        type="number"
                        step="any"
                        value={editLocation.longitude}
                        onChange={(e) =>
                          setEditLocation((p) => ({
                            ...p,
                            longitude: Number(e.target.value),
                          }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Longitud"
                      />
                      <input
                        value={editLocation.name ?? ""}
                        onChange={(e) =>
                          setEditLocation((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Nombre"
                      />
                      <input
                        value={editLocation.address ?? ""}
                        onChange={(e) =>
                          setEditLocation((p) => ({
                            ...p,
                            address: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Dirección"
                      />
                    </div>
                  ) : null}

                  {editContentType === "interactive" ? (
                    <InteractivePayloadEditor
                      value={editInteractive}
                      onChange={setEditInteractive}
                    />
                  ) : null}

                  <div>
                    <p className="mb-2 text-sm font-medium">Multimedia</p>
                    <div className="flex flex-wrap gap-2">
                      {media.map((asset) => {
                        const checked = editMediaIds.includes(asset.id);
                        return (
                          <label
                            key={asset.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                              checked
                                ? "border-brand/50 bg-brand/10"
                                : "border-border"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setEditMediaIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== asset.id)
                                    : [...prev, asset.id],
                                )
                              }
                            />
                            {BOT_MEDIA_TYPE_LABELS[asset.media_type]} ·{" "}
                            {asset.name}
                          </label>
                        );
                      })}
                      {media.length === 0 ? (
                        <p className="text-xs text-muted">
                          Sube multimedia en la pestaña Multimedia.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <WhatsAppPreview
                    body={editBody}
                    contentType={editContentType}
                    media={previewMedia}
                    location={
                      editContentType === "location" ? editLocation : null
                    }
                    interactive={editInteractive}
                  />

                  {/* Conexiones del nodo */}
                  <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-medium">
                      Conexiones desde este nodo
                    </p>
                    <ul className="mb-3 space-y-2">
                      {outgoingEdges.map((edge) => {
                        const to = nodeById.get(edge.to_node_id);
                        return (
                          <li
                            key={edge.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                          >
                            <button
                              type="button"
                              className="text-left"
                              onClick={() =>
                                to ? applyNodeToForm(to) : undefined
                              }
                            >
                              <span className="font-medium">
                                {edge.label || edge.trigger_value || "(sin etiqueta)"}
                              </span>
                              <span className="text-muted">
                                {" "}
                                · {edge.trigger_type}
                                {edge.trigger_value
                                  ? `:${edge.trigger_value}`
                                  : ""}{" "}
                                → {to?.code ?? "?"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleDeleteEdge(edge)}
                              className="text-xs text-danger"
                            >
                              Quitar
                            </button>
                          </li>
                        );
                      })}
                      {outgoingEdges.length === 0 ? (
                        <li className="text-xs text-muted">Sin salidas</li>
                      ) : null}
                    </ul>

                    <form
                      onSubmit={handleAddEdge}
                      className="grid gap-2 md:grid-cols-2"
                    >
                      <select
                        required
                        value={edgeTo}
                        onChange={(e) => setEdgeTo(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                      >
                        <option value="">Nodo destino…</option>
                        {detail.nodes
                          .filter((n) => n.id !== selectedNodeId)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.code} — {n.name}
                            </option>
                          ))}
                      </select>
                      <input
                        value={edgeLabel}
                        onChange={(e) => setEdgeLabel(e.target.value)}
                        placeholder="Etiqueta"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <select
                        value={edgeTriggerType}
                        onChange={(e) =>
                          setEdgeTriggerType(
                            e.target.value as BotEdgeTriggerType,
                          )
                        }
                        className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                      >
                        {BOT_EDGE_TRIGGER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        value={edgeTriggerValue}
                        onChange={(e) => setEdgeTriggerValue(e.target.value)}
                        placeholder="Valor trigger (id botón)"
                        className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"
                      >
                        Agregar conexión
                      </button>
                    </form>
                  </div>
                </>
              )}

              {showVersions ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-sm font-medium">
                    Historial de versiones
                  </p>
                  <ul className="max-h-72 space-y-2 overflow-auto">
                    {versions.map((version) => (
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
                              {version.change_note
                                ? ` · ${version.change_note}`
                                : ""}
                            </span>
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
                        <p className="mt-1 text-xs text-muted">
                          {(version.snapshot?.nodes ?? []).length} nodos ·{" "}
                          {(version.snapshot?.edges ?? []).length} conexiones ·{" "}
                          {version.status}
                        </p>
                      </li>
                    ))}
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
    </div>
  );
}
