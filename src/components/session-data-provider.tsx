"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { SessionDetail } from "@/lib/types";

type Operator = { id: string; name: string };

type SessionContextType = {
  detail: SessionDetail | null;
  operator: Operator | null;
  loading: boolean;
  sending: boolean;
  error: string;
  toast: string;
  quantity: string;
  setQuantity: (q: string) => void;
  setToast: (msg: string) => void;
  submitCount: (code: string, method: "CAMERA" | "MANUAL" | "USB") => Promise<void>;
  reverse: (eventId: string) => Promise<void>;
  closeSession: () => Promise<void>;
  join: (name: string) => Promise<Operator>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function useSessionData() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionData must be used within SessionDataProvider");
  return ctx;
}

export function SessionDataProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
        setDetail(data);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la sesión");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [sessionId],
  );

  const join = useCallback(
    async (name: string) => {
      const data = await apiFetch<{ operator: Operator }>(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setOperator(data.operator);
      localStorage.setItem("stockscan_operator", JSON.stringify(data.operator));
      return data.operator;
    },
    [sessionId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const saved = localStorage.getItem("stockscan_operator");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Operator;
          setOperator(parsed);
          void join(parsed.name).catch(() => localStorage.removeItem("stockscan_operator"));
        } catch {
          localStorage.removeItem("stockscan_operator");
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [join, load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const submitCount = useCallback(
    async (code: string, inputMethod: "CAMERA" | "MANUAL" | "USB") => {
      if (!operator || !detail || detail.session.status !== "OPEN" || sending) return;
      setSending(true);
      setError("");
      try {
        const result = await apiFetch<{
          duplicate: boolean;
          product?: { description: string; unit: string };
          total?: number;
        }>(`/api/sessions/${sessionId}/counts`, {
          method: "POST",
          body: JSON.stringify({
            code: code.trim(),
            quantity: Number(quantity || 1),
            operatorId: operator.id,
            operationId: crypto.randomUUID(),
            inputMethod,
          }),
        });
        if (!result.duplicate && result.product) {
          setToast(`${result.product.description}: total ${Number(result.total ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 3 })} ${result.product.unit}`);
        }
        await load(true);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "No se pudo registrar el conteo";
        setError(message);
        navigator.vibrate?.(250);
      } finally {
        setSending(false);
      }
    },
    [operator, detail, sending, quantity, sessionId, load],
  );

  const reverse = useCallback(
    async (eventId: string) => {
      setSending(true);
      setError("");
      try {
        await apiFetch(`/api/counts/${eventId}/reverse`, { method: "POST", body: "{}" });
        setToast("Conteo anulado");
        await load(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo anular");
      } finally {
        setSending(false);
      }
    },
    [load],
  );

  const closeSession = useCallback(async () => {
    if (!confirm("¿Cerrar la sesión? Después no se podrán registrar más conteos.")) return;
    setSending(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/close`, { method: "POST", body: "{}" });
      setToast("Sesión cerrada");
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión");
    } finally {
      setSending(false);
    }
  }, [sessionId, load]);

  return (
    <SessionContext.Provider
      value={{
        detail,
        operator,
        loading,
        sending,
        error,
        toast,
        quantity,
        setQuantity,
        setToast,
        submitCount,
        reverse,
        closeSession,
        join,
        refresh: load,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
