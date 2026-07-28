"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  History,
  LoaderCircle,
  Plus,
  ScanBarcode,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatDateOnlyLima } from "@/lib/date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type V5Session = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  recordCount: number;
};

export default function V5SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<V5Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: V5Session[] }>("/api/sessions/v5");
      startTransition(() => setSessions(data.sessions));
    } catch {
      /* The empty state is enough when the list cannot be loaded. */
    } finally {
      setLoading(false);
    }
  }, [startTransition]);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  const active = sessions.filter((session) =>
    ["OPEN", "PAUSED", "REVIEW"].includes(session.status),
  );
  const closed = sessions.filter((session) => session.status === "CLOSED");
  const visible = filter === "all" ? sessions : filter === "active" ? active : closed;

  function statusLabel(status: string) {
    if (status === "OPEN") return <Badge className="bg-emerald-50 text-emerald-700">Abierta</Badge>;
    if (status === "PAUSED") return <Badge className="bg-amber-50 text-amber-700">Pausada</Badge>;
    if (status === "REVIEW") return <Badge className="bg-purple-50 text-purple-700">En revisión</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">Cerrada</Badge>;
  }

  function openSession(session: V5Session) {
    router.push(
      session.status === "CLOSED"
        ? `/sessions/v5/${session.id}/history`
        : `/sessions/v5/${session.id}/scan`,
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Sesiones V5</h1>
          <p className="text-sm text-slate-500">
            Captura rápida general por código de producto, sin importaciones ni ubicaciones.
          </p>
        </div>
        <Link href="/sessions/v5/new">
          <Button size="sm">
            <Plus size={14} /> Nueva sesión V5
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "active", "closed"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${filter === value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
          >
            {value === "all" ? "Todas" : value === "active" ? "Activas" : "Cerradas"}
            <span className="ml-1.5 text-xs opacity-60">
              ({value === "all" ? sessions.length : value === "active" ? active.length : closed.length})
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-sm text-slate-400">
            <ScanBarcode size={32} className="text-slate-200" />
            <p>No hay sesiones V5 {filter !== "all" ? filter === "active" ? "activas" : "cerradas" : ""}.</p>
            <Link href="/sessions/v5/new">
              <Button size="sm">
                <Plus size={14} /> Crear sesión V5
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer transition hover:border-teal-300 hover:shadow-sm"
              onClick={() => openSession(session)}
            >
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  {session.status === "CLOSED" ? <History size={19} /> : <ScanBarcode size={19} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{session.name}</p>
                    {statusLabel(session.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {session.code} · {formatDateOnlyLima(session.createdAt)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{session.recordCount}</p>
                  <p className="text-xs text-slate-400">registros</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/sessions/v5/${session.id}/history`);
                    }}
                  >
                    <Clock3 size={14} /> Historial
                  </Button>
                  {session.status !== "CLOSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/sessions/v5/${session.id}/scan`);
                      }}
                    >
                      <CheckCircle2 size={14} /> Capturar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
