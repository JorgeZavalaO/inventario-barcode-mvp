"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Download,
  History,
  LoaderCircle,
  Package,
  Send,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatDateTimeLima } from "@/lib/date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Session = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type Event = {
  id: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  operatorName: string;
  cajas: number;
  unidadesPorCaja: number;
  total: number;
  notes: string;
  createdAt: string;
};

type HistoryResponse = {
  session: Session;
  events: Event[];
  summary: {
    totalRecords: number;
    totalCajas: number;
    totalUnits: number;
    productCount: number;
  };
};

export default function V5HistoryPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<HistoryResponse>(`/api/sessions/v5/${id}`);
      startTransition(() => setData(response));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [id, startTransition]);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  async function changeStatus(status: "REVIEW" | "CLOSED") {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/v5/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la sesión");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!data) return;
    setExporting(true);
    setError("");
    try {
      const response = await fetch(`/api/sessions/v5/${id}/export`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo exportar el historial");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `captura-v5-${data.session.code}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo exportar el historial");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando historial...
      </div>
    );
  }

  if (!data) {
    return <div className="py-16 text-center text-slate-500">Historial no disponible.</div>;
  }

  const { session, summary, events } = data;
  const statusIsOpen = session.status === "OPEN";
  const statusIsReview = session.status === "REVIEW";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/sessions/v5" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">{session.name}</h1>
            <Badge className={statusIsOpen ? "bg-emerald-50 text-emerald-700" : statusIsReview ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"}>
              {statusIsOpen ? "Abierta" : statusIsReview ? "En revisión" : "Cerrada"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">{session.code} · Historial de captura V5</p>
        </div>
        {session.status !== "CLOSED" && (
          <Link href={`/sessions/v5/${id}/scan`}>
            <Button size="sm" variant="outline">
              <Package size={14} /> Capturar
            </Button>
          </Link>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={<History size={17} />} value={summary.totalRecords} label="Registros" />
        <MetricCard icon={<Boxes size={17} />} value={summary.totalCajas} label="Cajas" />
        <MetricCard icon={<Package size={17} />} value={summary.totalUnits} label="Unidades" />
        <MetricCard icon={<CheckCircle2 size={17} />} value={summary.productCount} label="Productos" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <LoaderCircle className="mr-1.5 animate-spin" size={14} /> : <Download size={14} className="mr-1.5" />}
          Exportar Excel
        </Button>
        {statusIsOpen && events.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => void changeStatus("REVIEW")} disabled={busy}>
            <Send size={14} className="mr-1.5" /> Enviar a revisión
          </Button>
        )}
        {statusIsReview && (
          <Button size="sm" variant="destructive" onClick={() => void changeStatus("CLOSED")} disabled={busy}>
            Cerrar sesión
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <History size={17} className="text-teal-600" />
            <h2 className="font-semibold">Registros guardados</h2>
          </div>

          {events.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Aún no hay registros en esta sesión.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((event) => (
                <div key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.4fr_.8fr_.7fr_1.2fr] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{event.productDescription}</p>
                    <p className="text-xs text-slate-400">{event.productCode} · {event.productUnit}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-700">{event.cajas}</span> cajas × <span className="font-semibold text-slate-700">{event.unidadesPorCaja}</span>
                  </div>
                  <div className="text-sm font-bold text-teal-700">{event.total} {event.productUnit}</div>
                  <div className="text-xs text-slate-500">
                    <p>{event.operatorName} · {formatDateTimeLima(event.createdAt)}</p>
                    {event.notes && <p className="mt-1 italic text-slate-400">{event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="mb-1 flex justify-center text-teal-600">{icon}</div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
