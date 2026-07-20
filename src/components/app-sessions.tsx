"use client";

import Link from "next/link";
import {
  ArrowRight,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { InventorySession } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function statusBadge(status: InventorySession["status"]) {
  if (status === "OPEN") return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Abierta</Badge>;
  if (status === "PAUSED") return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">Pausada</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Cerrada</Badge>;
}

export function AppSessions() {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: `Inventario ${new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date())}`,
    warehouse: "Almacén principal",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ sessions: InventorySession[] }>("/api/sessions");
      setSessions(data.sessions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las sesiones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await apiFetch<{ session: InventorySession }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(form),
      });
      window.location.href = `/sessions/${data.session.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la sesión");
      setBusy(false);
    }
  }

  const openSessions = sessions.filter((s) => s.status === "OPEN").length;
  const totalUnits = sessions.reduce((t, s) => t + Number(s.total_units ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sesiones</h1>
          <p className="text-sm text-slate-500">Crea y administra sesiones de conteo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Actualizar">
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Play size={20} /></span>
              <div>
                <CardTitle className="text-lg">Nueva sesión</CardTitle>
                <CardDescription>Crea una sesión para comenzar el conteo.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">Nombre</Label>
                <Input id="session-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-warehouse">Almacén o ubicación</Label>
                <Input id="session-warehouse" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Plus size={18} />}
                Crear e ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold tabular-nums">{openSessions}</p>
              <p className="mt-1 text-xs text-slate-500">Sesiones abiertas</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold tabular-nums">{totalUnits.toLocaleString("es-PE")}</p>
              <p className="mt-1 text-xs text-slate-500">Unidades contadas</p>
            </Card>
          </div>

          <Card className="divide-y divide-slate-100 p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando sesiones...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="mx-auto mb-2 text-slate-300" size={34} />
                <p className="font-semibold text-slate-700">Sin sesiones aún</p>
                <p className="text-sm text-slate-500">Crea la primera cuando tengas productos en el catálogo.</p>
              </div>
            ) : sessions.slice(0, 10).map((session) => {
              const progress = session.product_count
                ? Math.round(((session.counted_products ?? 0) / session.product_count) * 100)
                : 0;
              return (
                <Link key={session.id} href={`/sessions/${session.id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:px-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-600">{progress}%</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{session.name}</p>
                      {statusBadge(session.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{session.code} · {session.warehouse} · {session.counted_products ?? 0}/{session.product_count ?? 0} productos</p>
                  </div>
                  <ArrowRight className="shrink-0 text-slate-400" size={18} />
                </Link>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
