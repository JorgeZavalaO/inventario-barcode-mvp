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
  BarChart3,
  Table2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductDifference = {
  productId: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  expectedQty: number;
  countedQty: number;
  difference: number;
  diffType: string;
  reviewStatus: "CORRECT" | "INCORRECT" | "NO_REGISTRATION";
  comment: string;
  cajas: number;
  unidadesPorCaja: number;
};

type BoxDifference = {
  boxId: string;
  boxCountEntryId: string;
  importCode: string;
  palletNumber: string;
  boxNumber: string;
  status: string;
  roundId: string;
  totalExpected: number;
  totalCounted: number;
  difference: number;
  diffType: string;
  products: ProductDifference[];
  eventCount: number;
  countedAt: string;
  digitizerName: string;
  countedByName: string;
};

type ReviewSummary = {
  totalBoxes: number;
  matchingBoxes: number;
  differingBoxes: number;
  totalExpected: number;
  totalCounted: number;
};

type ProductSummaryRow = {
  productId: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  totalCajas: number;
  countedQty: number;
  expectedQty: number;
  difference: number;
  diffType: string;
  comment: string;
};

export default function V4ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [differences, setDifferences] = useState<BoxDifference[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [productSummary, setProductSummary] = useState<ProductSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "detail">("summary");

  const load = useCallback(async () => {
    try {
      const [reviewData, sessionData] = await Promise.all([
        apiFetch<{ differences: BoxDifference[]; summary: ReviewSummary; productSummary: ProductSummaryRow[] }>(`/api/sessions/v4/${id}/review`),
        apiFetch<{ session: { name: string; status: string } }>(`/api/sessions/v4/${id}`),
      ]);
      setDifferences(reviewData.differences);
      setSummary(reviewData.summary);
      setProductSummary(reviewData.productSummary);
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
      await apiFetch(`/api/sessions/v4/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          boxCountEntryId: boxDiff.boxCountEntryId,
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
      await apiFetch(`/api/sessions/v4/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          boxCountEntryId: boxDiff.boxCountEntryId,
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
      await apiFetch(`/api/sessions/v4/${id}`, {
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

  async function handleSendToReview() {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v4/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REVIEW" }),
      });
      setToast("Enviado a revisión");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      const response = await fetch(`/api/sessions/v4/${id}/export`);
      if (!response.ok) throw new Error("Error al exportar");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventario-v4-${id}.xlsx`;
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

  function diffBadge(diffType: string, difference: number) {
    if (diffType === "coincide")
      return <span className="text-sm font-medium text-green-600">0</span>;
    if (diffType === "sobrante")
      return <span className="text-sm font-medium text-blue-600">+{difference}</span>;
    return <span className="text-sm font-medium text-red-600">{difference}</span>;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );

  const hasData = differences.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v4" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">
            Revisión: {sessionName}
          </h1>
          <p className="text-xs text-slate-400">V4 · {sessionStatus}</p>
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
              <p className="text-2xl font-bold text-green-600">{summary.matchingBoxes}</p>
              <p className="text-xs text-slate-500">Coinciden</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.differingBoxes}</p>
              <p className="text-xs text-slate-500">Diferencias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.totalCounted}</p>
              <p className="text-xs text-slate-500">Total contado</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => void handleExport()}>
          <Download size={14} className="mr-1" /> Exportar Excel
        </Button>
        {(sessionStatus === "OPEN" || sessionStatus === "REVIEW") && (
          <Button size="sm" onClick={() => void handleSendToReview()} disabled={busy}>
            Enviar a revisión
          </Button>
        )}
        {sessionStatus === "REVIEW" && (
          <Button variant="destructive" size="sm" onClick={() => void handleClose()} disabled={busy}>
            Cerrar sesión
          </Button>
        )}
        <Link href={`/sessions/v4/${id}/scan`}>
          <Button variant="ghost" size="sm">Volver al conteo</Button>
        </Link>
      </div>

      {hasData && (
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === "summary"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart3 size={16} />
            Resumen por producto
            <span className="text-xs opacity-60">({productSummary.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("detail")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === "detail"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Table2 size={16} />
            Detalle por caja
            <span className="text-xs opacity-60">({summary?.totalBoxes ?? 0})</span>
          </button>
        </div>
      )}

      {!hasData ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">
            No hay cajas contadas aún.
          </CardContent>
        </Card>
      ) : activeTab === "summary" ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cajas</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Unidad</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="hidden md:table-cell">Comentario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.map((p) => (
                  <TableRow
                    key={p.productId}
                    className={p.diffType === "coincide" ? "bg-green-50/50" : ""}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{p.productDescription}</p>
                      <p className="text-xs text-slate-400">{p.productCode}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{p.totalCajas}</TableCell>
                    <TableCell className="text-center text-xs text-slate-500 hidden md:table-cell">{p.productUnit}</TableCell>
                    <TableCell className="text-right text-sm">{p.expectedQty}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{p.countedQty}</TableCell>
                    <TableCell className="text-right">
                      {diffBadge(p.diffType, p.difference)}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs text-slate-600 hidden md:table-cell">
                      {p.comment || <span className="text-slate-300">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
            {productSummary.length} producto{productSummary.length !== 1 ? "s" : ""} · {" "}
            {summary?.totalBoxes ?? 0} caja{summary?.totalBoxes !== 1 ? "s" : ""} · {" "}
            {summary?.totalCounted ?? 0} unidades totales
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Importación</TableHead>
                  <TableHead>Pallet</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Cajas</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Unds/caja</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Esperado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead>Revisión</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {differences.flatMap((diff) =>
                  diff.products.map((product) => (
                    <TableRow
                      key={`${diff.boxId}-${product.productId}`}
                      className={diff.diffType === "coincide" ? "bg-green-50/50" : ""}
                    >
                      <TableCell className="text-xs">{diff.importCode}</TableCell>
                      <TableCell className="text-xs">{diff.palletNumber}</TableCell>
                      <TableCell className="text-xs font-medium">{diff.boxNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{product.productDescription}</p>
                        <p className="text-xs text-slate-400">{product.productCode}</p>
                      </TableCell>
                      <TableCell className="text-center text-xs hidden md:table-cell">{product.cajas}</TableCell>
                      <TableCell className="text-center text-xs hidden md:table-cell">{product.unidadesPorCaja}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{product.countedQty}</TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{product.expectedQty}</TableCell>
                      <TableCell className="text-right">
                        {diffBadge(product.diffType, product.difference)}
                      </TableCell>
                      <TableCell>{statusBadge(diff.status)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {diff.status === "SUBMITTED" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600"
                              onClick={() => void handleApprove(diff)}
                              disabled={busy}
                            >
                              <CheckCircle2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-600"
                              onClick={() => void handleReject(diff)}
                              disabled={busy}
                            >
                              <XCircle size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
