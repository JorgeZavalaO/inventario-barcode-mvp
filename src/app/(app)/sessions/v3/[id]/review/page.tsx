"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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
  const [page, setPage] = useState(1);
  const perPage = 25;

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
      await apiFetch(`/api/sessions/v3/${id}/review`, {
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

  async function handleSendToReview() {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v3/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REVIEW" }),
      });
      setToast("Captura enviada a revisión");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No tienes permisos para enviar a revisión");
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

  type FlatRow = BoxDifference & { product: BoxDifference["products"][number] };

  const allRows = useMemo<FlatRow[]>(
    () => differences.flatMap((diff) => diff.products.map((product) => ({ ...diff, product }))),
    [differences],
  );

  const totalPages = Math.max(1, Math.ceil(allRows.length / perPage));
  const paginatedRows = allRows.slice((page - 1) * perPage, page * perPage);

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function renderPageNumbers() {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => goToPage(1)} href="#">1</PaginationLink>
        </PaginationItem>,
      );
      if (start > 2) pages.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
    }
    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={i === page} onClick={() => goToPage(i)} href="#">{i}</PaginationLink>
        </PaginationItem>,
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => goToPage(totalPages)} href="#">{totalPages}</PaginationLink>
        </PaginationItem>,
      );
    }
    return pages;
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
        {sessionStatus === "OPEN" && (
          <Button size="sm" onClick={() => void handleSendToReview()} disabled={busy}>
            Enviar captura a revisión
          </Button>
        )}
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

      {allRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">
            No hay cajas contadas aún.
          </CardContent>
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
                  <TableHead>Digitador</TableHead>
                  <TableHead>Operario contador</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => (
                  <TableRow
                    key={`${row.boxId}-${row.product.productId}`}
                    className={row.diffType === "coincide" ? "bg-green-50/50" : ""}
                  >
                    <TableCell className="text-xs">{row.importCode}</TableCell>
                    <TableCell className="text-xs">{row.palletNumber}</TableCell>
                    <TableCell className="text-xs font-medium">{row.boxNumber}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{row.product.productDescription}</p>
                      <p className="text-xs text-slate-400">{row.product.productCode}</p>
                    </TableCell>
                    <TableCell className="text-xs">{row.digitizerName}</TableCell>
                    <TableCell className="text-xs">{row.countedByName}</TableCell>
                    <TableCell className="text-right text-sm">{row.product.expectedQty}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{row.product.countedQty}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          row.product.diffType === "coincide"
                            ? "text-green-600"
                            : row.product.diffType === "sobrante"
                              ? "text-blue-600"
                              : "text-red-600"
                        }`}
                      >
                        {row.product.diffType === "coincide"
                          ? "0"
                          : row.product.diffType === "sobrante"
                            ? `+${row.product.difference}`
                            : row.product.difference}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-right">
                      {row.status === "SUBMITTED" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-600"
                            onClick={() => void handleApprove(row)}
                            disabled={busy}
                          >
                            <CheckCircle2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-600"
                            onClick={() => void handleReject(row)}
                            disabled={busy}
                          >
                            <XCircle size={14} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
            <p>
              {allRows.length} registro{allRows.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => goToPage(page - 1)}
                      href="#"
                      text="Anterior"
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                  {renderPageNumbers()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => goToPage(page + 1)}
                      href="#"
                      text="Siguiente"
                      className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
