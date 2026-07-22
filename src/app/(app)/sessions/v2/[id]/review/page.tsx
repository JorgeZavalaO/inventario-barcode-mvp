"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, CheckCircle2, AlertTriangle, LoaderCircle, Download, ThumbsUp, ThumbsDown, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DiffItem = {
  sessionPositionId: string;
  positionId: string;
  positionCode: string;
  path: string;
  status: string;
  theoreticalTotal: number;
  countedTotal: number;
  difference: number;
  diffType: "coincide" | "faltante" | "sobrante";
  roundTotals: { roundId: string; roundNumber: number; status: string; total: number }[];
  products: { code: string; quantity: number }[];
  snapshots: { productCode: string; productDescription: string; theoreticalStock: number }[];
};

export default function V2ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [differences, setDifferences] = useState<DiffItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/sessions/v2/${id}/review`);
      setDifferences(data.differences);
      setSummary(data.summary);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);

  async function handleAction(spId: string, roundId: string, action: "approve" | "reject") {
    setApproving(spId);
    try {
      await apiFetch(`/api/sessions/v2/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ sessionPositionId: spId, roundId, action }),
      });
      setToast(action === "approve" ? "Ronda aprobada" : "Ronda rechazada, se requiere reconteo");
      await load();
    } catch { setToast("Error"); }
    finally { setApproving(null); }
  }

  async function handleExport() {
    try {
      const resp = await fetch(`/api/sessions/v2/${id}/export`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `inventario-${id.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Excel descargado");
    } catch { setToast("Error al exportar"); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;

  const diffColor = (type: string) =>
    type === "coincide" ? "text-teal-600" : type === "faltante" ? "text-red-600" : "text-amber-600";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/sessions/v2/${id}/scan`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold tracking-tight">Revisión</h1>
          {toast && <span className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-600">{toast}</span>}
        </div>
        <Button size="sm" onClick={handleExport}><Download size={14} /> Exportar Excel</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold">{summary.totalPositions}</p><p className="text-xs text-slate-500">Total posiciones</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-teal-600">{summary.completedPositions}</p><p className="text-xs text-slate-500">Completadas</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-emerald-600">{summary.matchingPositions}</p><p className="text-xs text-slate-500">Coinciden</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-red-600">{summary.differingPositions}</p><p className="text-xs text-slate-500">Con diferencia</p></CardContent></Card>
        </div>
      )}

      <div className="space-y-3">
        {differences.map((diff) => {
          const lastRound = diff.roundTotals[diff.roundTotals.length - 1];
          return (
            <Card key={diff.sessionPositionId} className={diff.status === "PENDING" ? "border-amber-200" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="mt-0.5 text-slate-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{diff.positionCode}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.status === "COMPLETED" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                          {diff.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{diff.path}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${diffColor(diff.diffType)}`}>
                      {diff.difference > 0 ? "+" : ""}{diff.difference}
                    </p>
                    <p className="text-xs text-slate-400">T: {diff.theoreticalTotal} · C: {diff.countedTotal}</p>
                  </div>
                </div>

                {diff.snapshots.length > 0 && (
                  <div className="mt-2 ml-8 space-y-0.5">
                    {diff.snapshots.map((sn) => (
                      <p key={sn.productCode} className="text-xs text-slate-500">
                        {sn.productDescription}: esperado {sn.theoreticalStock}
                      </p>
                    ))}
                  </div>
                )}

                {diff.products.length > 0 && (
                  <div className="mt-2 ml-8 space-y-0.5">
                    {diff.products.map((p, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        Contado: {p.code} → {p.quantity}
                      </p>
                    ))}
                  </div>
                )}

                {lastRound && lastRound.status === "SUBMITTED" && (
                  <div className="mt-3 ml-8 flex gap-2">
                    <Button size="sm" onClick={() => void handleAction(diff.sessionPositionId, lastRound.roundId, "approve")} disabled={approving === diff.sessionPositionId}>
                      <ThumbsUp size={12} /> Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleAction(diff.sessionPositionId, lastRound.roundId, "reject")} disabled={approving === diff.sessionPositionId}>
                      <ThumbsDown size={12} /> Rechazar
                    </Button>
                  </div>
                )}

                {lastRound && (lastRound.status === "APPROVED" || lastRound.status === "REJECTED") && (
                  <div className="mt-2 ml-8 flex items-center gap-2 text-xs text-slate-500">
                    {lastRound.status === "APPROVED" ? <CheckCircle2 size={12} className="text-teal-500" /> : <AlertTriangle size={12} className="text-amber-500" />}
                    Ronda {lastRound.roundNumber}: {lastRound.status === "APPROVED" ? "Aprobada" : "Rechazada"}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {differences.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-slate-400">No hay posiciones en esta sesión.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
