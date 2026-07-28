"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { REAUTH_HEADER } from "@/lib/auth/reauth-constants";

export type ReauthPromptOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ReauthContextValue = {
  /** Abre el modal de contraseña. Resuelve token HMAC o null si cancela. */
  requestReauth: (options?: ReauthPromptOptions) => Promise<string | null>;
  /** Fetch que exige reauth en mutaciones (reutilizable en todo el panel). */
  secureFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const ReauthContext = createContext<ReauthContextValue | null>(null);

const DEFAULT_PROMPT: Required<ReauthPromptOptions> = {
  title: "Confirmar cambios",
  description:
    "Para guardar las modificaciones debes ingresar tu contraseña.",
  confirmLabel: "✅ Confirmar cambios",
  cancelLabel: "❌ Cancelar",
};

function isMutating(method?: string) {
  const upper = (method ?? "GET").toUpperCase();
  return (
    upper === "POST" ||
    upper === "PUT" ||
    upper === "PATCH" ||
    upper === "DELETE"
  );
}

export function ReauthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const resolverRef = useRef<((token: string | null) => void) | null>(null);

  const close = useCallback((token: string | null) => {
    setOpen(false);
    setPassword("");
    setError(null);
    setLoading(false);
    setPrompt(DEFAULT_PROMPT);
    resolverRef.current?.(token);
    resolverRef.current = null;
  }, []);

  const requestReauth = useCallback((options?: ReauthPromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setPassword("");
      setError(null);
      setPrompt({
        title: options?.title ?? DEFAULT_PROMPT.title,
        description: options?.description ?? DEFAULT_PROMPT.description,
        confirmLabel: options?.confirmLabel ?? DEFAULT_PROMPT.confirmLabel,
        cancelLabel: options?.cancelLabel ?? DEFAULT_PROMPT.cancelLabel,
      });
      setOpen(true);
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/reauthenticate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const payload = (await response.json()) as {
          ok: boolean;
          token?: string;
          error?: string;
        };
        // La contraseña no se reutiliza ni se guarda; solo se limpia al cerrar.
        if (!response.ok || !payload.ok || !payload.token) {
          setError(payload.error || "Contraseña incorrecta.");
          setLoading(false);
          setPassword("");
          return;
        }
        close(payload.token);
      } catch {
        setError("No se pudo validar la identidad");
        setLoading(false);
      }
    },
    [password, close],
  );

  const secureFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (!isMutating(method)) {
        return fetch(input, init);
      }

      const token = await requestReauth();
      if (!token) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Reautenticación cancelada",
            code: "REAUTH_CANCELLED",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const headers = new Headers(init?.headers);
      headers.set(REAUTH_HEADER, token);

      return fetch(input, {
        ...init,
        headers,
      });
    },
    [requestReauth],
  );

  const value = useMemo(
    () => ({ requestReauth, secureFetch }),
    [requestReauth, secureFetch],
  );

  return (
    <ReauthContext.Provider value={value}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => close(null)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative z-[81] w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground">
              {prompt.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{prompt.description}</p>

            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Contraseña
              </span>
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => close(null)}
                disabled={loading}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-strong"
              >
                {prompt.cancelLabel}
              </button>
              <button
                type="submit"
                disabled={loading || !password}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink disabled:opacity-60"
              >
                {loading ? "Validando..." : prompt.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </ReauthContext.Provider>
  );
}

export function useReauth() {
  const ctx = useContext(ReauthContext);
  if (!ctx) {
    throw new Error("useReauth debe usarse dentro de ReauthProvider");
  }
  return ctx;
}

/** Fetch seguro: aplica reauth automáticamente en mutaciones. */
export function useSecureFetch() {
  return useReauth().secureFetch;
}
