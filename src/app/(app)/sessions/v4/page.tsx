"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  Layers,
  Plus,
  LoaderCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyLima } from "@/lib/date-time";

type V4Session = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  _count: { countEvents: number; boxCountEntries: number };
};

export default function V4SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<V4Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: V4Session[] }>("/api/sessions/v4");
      setSessions(data.sessions);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = sessions.filter(
    (s) => s.status === "OPEN" || s.status === "PAUSED",
  );
  const closed = sessions.filter(
    (s) => s.status === "CLOSED" || s.status === "REVIEW",
  );
  const visible =
    filter === "all" ? sessions : filter === "active" ? active : closed;

  function statusLabel(status: string) {
    if (status === "OPEN")
      return <Badge className="bg-emerald-50 text-emerald-700">Abierta</Badge>;
    if (status === "PAUSED")
      return <Badge className="bg-amber-50 text-amber-700">Pausada</Badge>;
    if (status === "REVIEW")
      return <Badge className="bg-purple-50 text-purple-700">Revisión</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">Cerrada</Badge>;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Sesiones V4</h1>
          <p className="text-sm text-slate-500">
            Inventario por cajas simplificado — ingreso rápido por código de producto.
          </p>
        </div>
        <Link href="/sessions/v4/new">
          <Button size="sm">
            <Package size={14} /> Nueva sesión V4
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {(["all", "active", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${filter === f ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
          >
            {f === "all" ? "Todas" : f === "active" ? "Activas" : "Cerradas"}
            <span className="ml-1.5 text-xs opacity-60">
              (
              {f === "all"
                ? sessions.length
                : f === "active"
                  ? active.length
                  : closed.length}
              )
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-sm text-slate-400">
            <Layers size={32} className="text-slate-200" />
            <p>
              No hay sesiones V4{" "}
              {filter !== "all"
                ? filter === "active"
                  ? "activas"
                  : "cerradas"
                : ""}
              .
            </p>
            <Link href="/sessions/v4/new">
              <Button size="sm">
                <Plus size={14} /> Crear sesión V4
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
              onClick={() => {
                if (session.status === "OPEN" || session.status === "PAUSED")
                  router.push(`/sessions/v4/${session.id}/scan`);
                else if (session.status === "REVIEW")
                  router.push(`/sessions/v4/${session.id}/scan`);
                else router.push(`/sessions/v4/${session.id}/review`);
              }}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{session.name}</p>
                    {statusLabel(session.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {session.code} · {formatDateOnlyLima(session.createdAt)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{session._count.boxCountEntries}</p>
                  <p className="text-xs text-slate-400">registros</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/sessions/v4/${session.id}/review`);
                  }}
                >
                  Avances
                </Button>
                {(session.status === "OPEN" || session.status === "PAUSED") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/sessions/v4/${session.id}/scan`);
                    }}
                  >
                    <CheckCircle2 size={14} /> Ir
                  </Button>
                )}
                {session.status === "REVIEW" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sessions/v4/${session.id}/scan`);
                      }}
                    >
                      Continuar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sessions/v4/${session.id}/review`);
                      }}
                    >
                      Revisar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
