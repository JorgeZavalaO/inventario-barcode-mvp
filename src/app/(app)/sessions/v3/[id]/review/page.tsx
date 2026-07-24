"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type BoxDifference = {
  boxId: string;
  importCode: string;
  palletNumber: string;
  boxNumber: string;
  status: string;
  roundId: string;
  totalExpected: number;
  totalCounted: number;
  difference: number;
  diffType: string;
  products: {
    productId: string;
    productCode: string;
    productDescription: string;
    productUnit: string;
    expectedQty: number;
    countedQty: number;
    difference: number;
    diffType: string;
  }[];
  eventCount: number;
  countedAt: string;
};

type ReviewSummary = {
  totalBoxes: number;
  matchingBoxes: number;
  differingBoxes: number;
  totalExpected: number;
  totalCounted: number;
};

export default function V3ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [differences, setDifferences] = useState<BoxDifference[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const [reviewData, sessionData] = await Promise.all([
        apiFetch<{ differences: BoxDifference[]; summary: ReviewSummary }>(
          `/api/sessions/v3/${id}/review`,
        ),
        apiFetch<{ session: { name: string; status: string } }>(
          `/api/sessions/v3/${id}`,
        ),
      ]);
      setDifferences(reviewData.differences);
      setSummary(reviewData.summary);
      setSessionName(sessionData.session.name);
      setSessionStatus(sessionData.session.status);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleApprove(boxDiff: BoxDifference) {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v3/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          boxCountEntryId: boxDiff.boxId,
          roundId: boxDiff.roundId,
          action: "approve",
        }),
      });
      setToast(`Caja ${boxDiff.boxNumber} aprobada`);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(boxDiff: BoxDifference) {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v3/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          boxCountEntryId: boxDiff.boxId,
          roundId: boxDiff.roundId,
          action: "reject",
        }),
      });
      setToast(`Caja ${boxDiff.boxNumber} rechazada`);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v3/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      });
      setToast("Sesión cerrada");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      const response = await fetch(`/api/sessions/v3/${id}/export`);
      if (!response.ok) throw new Error("Error al exportar");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventario-${id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast("Error al exportar");
    }
  }

  function statusBadge(status: string) {
    if (status === "APPROVED")
      return <Badge className="bg-green-50 text-green-700">Aprobada</Badge>;
    if (status === "RECOUNT_REQUIRED")
      return <Badge className="bg-red-50 text-red-700">Reconteo</Badge>;
    if (status === "SUBMITTED")
      return <Badge className="bg-purple-50 text-purple-700">Enviada</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">{status}</Badge>;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v3" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">
            Revisión: {sessionName}
          </h1>
          <p className="text-xs text-slate-400">V3 · {sessionStatus}</p>
        </div>
        {toast && (
          <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-600">
            {toast}
          </span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{summary.totalBoxes}</p>
              <p className="text-xs text-slate-500">Cajas contadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {summary.matchingBoxes}
              </p>
              <p className="text-xs text-slate-500">Coinciden</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {summary.differingBoxes}
              </p>
              <p className="text-xs text-slate-500">Diferencias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {summary.totalCounted}
              </p>
              <p className="text-xs text-slate-500">Total contado</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => void handleExport()}>
          <Download size={14} className="mr-1" /> Exportar Excel
        </Button>
        {sessionStatus === "REVIEW" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleClose()}
            disabled={busy}
          >
            Cerrar sesión
          </Button>
        )}
      </div>

      {differences.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">
            No hay cajas contadas aún.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {differences.map((diff) => (
            <Card
              key={diff.boxId}
              className={
                diff.diffType === "coincide"
                  ? "border-green-200"
                  : "border-red-200"
              }
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">
                      {diff.importCode} / {diff.palletNumber} / {diff.boxNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      Esperado: {diff.totalExpected} · Contado: {diff.totalCounted} ·
                      Diferencia:{" "}
                      <span
                        className={
                          diff.difference > 0
                            ? "text-blue-600"
                            : diff.difference < 0
                              ? "text-red-600"
                              : "text-green-600"
                        }
                      >
                        {diff.difference > 0 ? "+" : ""}
                        {diff.difference}
                      </span>
                    </p>
                  </div>
                  {statusBadge(diff.status)}
                </div>

                <div className="space-y-2">
                  {diff.products.map((prod) => (
                    <div
                      key={prod.productId}
                      className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {prod.productDescription}
                        </p>
                        <p className="text-xs text-slate-400">{prod.productCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {prod.countedQty} / {prod.expectedQty} unds
                        </p>
                        <p
                          className={`text-xs ${prod.diffType === "coincide" ? "text-green-600" : prod.diffType === "sobrante" ? "text-blue-600" : "text-red-600"}`}
                        >
                          {prod.diffType === "coincide"
                            ? "Coincide"
                            : prod.diffType === "sobrante"
                              ? `+${prod.difference} sobrante`
                              : `${prod.difference} faltante`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {diff.status === "SUBMITTED" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => void handleApprove(diff)}
                      disabled={busy}
                    >
                      <CheckCircle2 size={14} className="mr-1" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => void handleReject(diff)}
                      disabled={busy}
                    >
                      <XCircle size={14} className="mr-1" /> Rechazar
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
