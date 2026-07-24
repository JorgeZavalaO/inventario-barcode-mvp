"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { apiFetch, apiFetchOffline } from "@/lib/client";
import { useOfflineData } from "@/hooks/use-offline-data";
import {
  ArrowLeft,
  LoaderCircle,
  Package,
  CheckCircle2,
  XCircle,
  Upload,
  FileSpreadsheet,
  WifiOff,
  Database,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

type SessionData = {
  id: string;
  code: string;
  name: string;
  status: string;
  sessionParticipants?: { operator: { id: string; name: string } }[];
};

type Operator = { id: string; name: string };

type BoxProduct = {
  productId: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  supplierCode?: string;
  expectedQty: number | null;
};

type ProductLine = {
  quantity: number;
  notes: string;
};

type ConfirmedProduct = {
  product: BoxProduct;
  correct: boolean;
  lines: ProductLine[];
  notes: string;
};

type Step = "IDENTIFY" | "CONFIRM" | "SUMMARY";

export default function V3ScanPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [step, setStep] = useState<Step>("IDENTIFY");

  const [selectedBoxImportId, setSelectedBoxImportId] = useState("");
  const [selectedBoxPalletId, setSelectedBoxPalletId] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [boxImport, setBoxImport] = useState("");
  const [boxPallet, setBoxPallet] = useState("");
  const [skipPallet, setSkipPallet] = useState(false);

  const [imports, setImports] = useState<{ id: string; code: string; description: string | null }[]>([]);
  const [pallets, setPallets] = useState<{ id: string; number: string }[]>([]);
  const [boxes, setBoxes] = useState<{ id: string; number: string }[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);
  const [loadingPallets, setLoadingPallets] = useState(false);
  const [loadingBoxes, setLoadingBoxes] = useState(false);

  const [resolvedBox, setResolvedBox] = useState<any>(null);
  const [boxProducts, setBoxProducts] = useState<BoxProduct[]>([]);
  const [currentProductIdx, setCurrentProductIdx] = useState(0);
  const [productCorrect, setProductCorrect] = useState(true);
  const [productLines, setProductLines] = useState<ProductLine[]>([{ quantity: 0, notes: "" }]);
  const [productNotes, setProductNotes] = useState("");
  const [confirmedProducts, setConfirmedProducts] = useState<ConfirmedProduct[]>([]);
  const [countsRegistered, setCountsRegistered] = useState(false);

  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [operator, setOperator] = useState<{ id: string; name: string } | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [countedByOperatorId, setCountedByOperatorId] = useState("");
  const [joining, setJoining] = useState(false);

  const offlineData = useOfflineData();
  const hasOfflineData = offlineData.counts.products > 0;

  useEffect(() => {
    const stored = localStorage.getItem("stockscan_operator_v3");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOperator(parsed);
        setSelectedOperatorId(parsed.id);
        setOperatorName(parsed.name);
      } catch {
        localStorage.removeItem("stockscan_operator_v3");
      }
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("stockscan_operators_v3");
    if (cached) {
      try {
        setOperators(JSON.parse(cached) as Operator[]);
      } catch {
        localStorage.removeItem("stockscan_operators_v3");
      }
    }
    void apiFetch<{ operators: Operator[] }>("/api/operators")
      .then((data) => {
        setOperators(data.operators);
        localStorage.setItem("stockscan_operators_v3", JSON.stringify(data.operators));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (offlineData.operators.length === 0) return;
    setOperators((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      for (const item of offlineData.operators) merged.set(item.id, item);
      return Array.from(merged.values());
    });
  }, [offlineData.operators]);

  useEffect(() => {
    const participants = session?.sessionParticipants?.map(({ operator: participant }) => participant) ?? [];
    if (participants.length === 0) return;
    setOperators((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      for (const participant of participants) merged.set(participant.id, participant);
      return Array.from(merged.values());
    });
  }, [session]);

  async function handleJoin() {
    if (!operatorName.trim()) return;
    setJoining(true);
    try {
      if (!offlineData.isOnline) {
        const cachedOperator = operators.find(
          (item) => item.id === selectedOperatorId || item.name.toLowerCase() === operatorName.trim().toLowerCase(),
        );
        if (!cachedOperator) {
          setToast("Selecciona un operario sincronizado para entrar offline");
          return;
        }
        setOperator(cachedOperator);
        setSelectedOperatorId(cachedOperator.id);
        setOperatorName(cachedOperator.name);
        localStorage.setItem("stockscan_operator_v3", JSON.stringify(cachedOperator));
        return;
      }
      const result = await apiFetch<{ operator: { id: string; name: string } }>(
        `/api/sessions/v3/${id}/join`,
        {
          method: "POST",
          body: JSON.stringify({ name: operatorName.trim() }),
        },
      );
      setOperator(result.operator);
      setSelectedOperatorId(result.operator.id);
      setOperatorName(result.operator.name);
      setOperators((current) => current.some((item) => item.id === result.operator.id) ? current : [...current, result.operator]);
      localStorage.setItem("stockscan_operator_v3", JSON.stringify(result.operator));
    } catch {
      setToast("Error al identificar");
    } finally {
      setJoining(false);
    }
  }

  async function createCountedOperator(name: string) {
    if (!offlineData.isOnline) {
      const existing = operators.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
      if (existing && existing.id !== operator?.id) {
        setCountedByOperatorId(existing.id);
      } else {
        setToast("Sin conexión: selecciona un operario sincronizado");
      }
      return;
    }
    try {
      const result = await apiFetch<{ operator: Operator }>("/api/operators", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (result.operator.id === operator?.id) {
        setToast("El operario contador debe ser diferente del digitador");
        return;
      }
      setOperators((current) => current.some((item) => item.id === result.operator.id) ? current : [...current, result.operator]);
      setCountedByOperatorId(result.operator.id);
      setToast("Operario agregado");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo crear el operario");
    }
  }

  function downloadBoxTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
      { importacion: "IMP-001", pallet: "PAL-01", caja: "CAJA-1", codigo_producto: "PROD-001", codigo_proveedor: "PROV-001", descripcion: "Producto ejemplo", unidad: "UND", cantidad_esperada: 10 },
      { importacion: "IMP-001", pallet: "PAL-01", caja: "CAJA-1", codigo_producto: "PROD-002", codigo_proveedor: "PROV-002", descripcion: "Otro producto", unidad: "UND", cantidad_esperada: 5 },
      { importacion: "IMP-001", pallet: "PAL-01", caja: "CAJA-2", codigo_producto: "PROD-003", codigo_proveedor: "", descripcion: "Tercer producto", unidad: "UND", cantidad_esperada: 20 },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Cajas");
    XLSX.writeFile(wb, "plantilla_cajas.xlsx");
  }

  async function handleBoxImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setImportResult("");
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(ws);
      const rows = jsonData
        .map((row: any) => ({
          importCode: row.importacion || row.importCode || row.import || "",
          palletNumber: row.pallet || row.palletNumber || row.numero_pallet || "",
          boxNumber: row.caja || row.boxNumber || row.numero_caja || "",
          productCode: row.codigo_producto || row.productCode || row.codigo || "",
          supplierCode: row.codigo_proveedor || row.supplierCode || row.proveedor || "",
          productDescription: row.descripcion || row.description || "",
          productUnit: row.unidad || row.unit || "UND",
          expectedQty: row.cantidad_esperada || row.expectedQty || row.cantidad || 0,
        }))
        .filter((r: any) => r.importCode && r.boxNumber && r.productCode);
      if (rows.length === 0) {
        setImportResult("No se encontraron filas válidas");
        return;
      }
      const result = await apiFetch<any>("/api/boxes/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setImportResult(
        `Importados: ${result.created.imports} importaciones, ${result.created.pallets} pallets, ${result.created.boxes} cajas, ${result.created.links} productos`,
      );
      await loadImports();
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "Error al importar");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function loadImports() {
    setLoadingImports(true);
    try {
      if (!offlineData.isOnline && hasOfflineData) {
        const offlineImports = await offlineData.getImports();
        setImports(offlineImports);
      } else {
        const data = await apiFetch<{ imports: { id: string; code: string; description: string | null }[] }>("/api/boxes/imports");
        setImports(data.imports);
      }
    } catch {
      const offlineImports = await offlineData.getImports();
      if (offlineImports.length > 0) setImports(offlineImports);
    } finally {
      setLoadingImports(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/sessions/v3/${id}`);
      setSession(data.session);
      localStorage.setItem(`stockscan_session_v3_${id}`, JSON.stringify(data.session));
    } catch {
      const cached = localStorage.getItem(`stockscan_session_v3_${id}`);
      let restored = false;
      if (cached) {
        try {
          setSession(JSON.parse(cached) as SessionData);
          restored = true;
        } catch {
          localStorage.removeItem(`stockscan_session_v3_${id}`);
        }
      }
      if (!restored) {
        const cachedSessions = localStorage.getItem("stockscan_sessions_v3");
        if (cachedSessions) {
          try {
            const summary = (JSON.parse(cachedSessions) as SessionData[]).find((item) => item.id === id);
            if (summary) setSession(summary);
          } catch {
            localStorage.removeItem("stockscan_sessions_v3");
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (step !== "IDENTIFY" || (!hasOfflineData && !offlineData.isOnline)) return;
    void loadImports();
  }, [step, hasOfflineData, offlineData.isOnline]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleImportSelect(importId: string) {
    setSelectedBoxImportId(importId);
    setSelectedBoxPalletId("");
    setSelectedBoxId("");
    setBoxPallet("");
    setPallets([]);
    setBoxes([]);
    setResolvedBox(null);
    setBoxProducts([]);
    setSkipPallet(false);
    if (!importId) return;
    const imp = imports.find((i) => i.id === importId);
    if (imp) setBoxImport(imp.code);
    setLoadingPallets(true);
    try {
      if (!offlineData.isOnline && hasOfflineData) {
        const offlinePallets = await offlineData.getPalletsByImport(importId);
        setPallets(offlinePallets);
        if (offlinePallets.length === 0) {
          setSkipPallet(true);
          setBoxes(await offlineData.getBoxesByImport(importId));
        }
      } else {
        const data = await apiFetch<{ pallets: { id: string; number: string }[] }>(
          `/api/boxes/pallets?importId=${importId}`,
        );
        setPallets(data.pallets);
        if (data.pallets.length === 0) {
          setSkipPallet(true);
          const boxesData = await apiFetch<{ boxes: { id: string; number: string }[] }>(
            `/api/boxes/boxes?importId=${importId}`,
          );
          setBoxes(boxesData.boxes);
        }
      }
    } catch {
      const offlinePallets = await offlineData.getPalletsByImport(importId);
      setPallets(offlinePallets);
      if (offlinePallets.length === 0) {
        setSkipPallet(true);
        setBoxes(await offlineData.getBoxesByImport(importId));
      }
    } finally {
      setLoadingPallets(false);
    }
  }

  async function handlePalletSelect(palletId: string) {
    setSelectedBoxPalletId(palletId);
    setSelectedBoxId("");
    setBoxes([]);
    setResolvedBox(null);
    setBoxProducts([]);
    if (!palletId) {
      setBoxPallet("");
      setSkipPallet(false);
      return;
    }
    const pal = pallets.find((p) => p.id === palletId);
    if (pal) setBoxPallet(pal.number);
    setLoadingBoxes(true);
    try {
      if (!offlineData.isOnline && hasOfflineData) {
        const offlineBoxes = await offlineData.getBoxesByPallet(palletId);
        setBoxes(offlineBoxes);
      } else {
        const data = await apiFetch<{ boxes: { id: string; number: string }[] }>(
          `/api/boxes/boxes?palletId=${palletId}`,
        );
        setBoxes(data.boxes);
      }
    } catch {
      setBoxes(await offlineData.getBoxesByPallet(palletId));
    } finally {
      setLoadingBoxes(false);
    }
  }

  async function handleBoxSelect(boxId: string) {
    setSelectedBoxId(boxId);
    if (!boxId) {
      setResolvedBox(null);
      setBoxProducts([]);
      return;
    }
    const bx = boxes.find((b) => b.id === boxId);
    if (!bx) return;
    setBusy(true);
    try {
      if (!offlineData.isOnline && hasOfflineData) {
        const resolved = await offlineData.resolveBox(boxImport.trim(), bx.number, boxPallet.trim() || undefined);
        if (resolved) {
          setResolvedBox(resolved);
          setBoxProducts(
            resolved.products.map((pr: any) => ({
              productId: pr.productId,
              productCode: pr.productCode,
              productDescription: pr.productDescription,
              productUnit: pr.productUnit,
              supplierCode: pr.supplierCode || undefined,
              expectedQty: pr.expectedQty,
            })),
          );
        } else {
          setToast("Caja no encontrada en datos offline");
          setResolvedBox(null);
          setBoxProducts([]);
        }
      } else {
        const p = new URLSearchParams({ import: boxImport.trim(), box: bx.number });
        if (boxPallet.trim()) p.set("pallet", boxPallet.trim());
        const data = await apiFetch<any>(`/api/boxes/resolve?${p.toString()}`);
        setResolvedBox(data.box);
        setBoxProducts(
          data.box.products.map((pr: any) => ({
            productId: pr.productId,
            productCode: pr.productCode,
            productDescription: pr.productDescription,
            productUnit: pr.productUnit,
            supplierCode: pr.supplierCode || undefined,
            expectedQty: pr.expectedQty,
          })),
        );
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Caja no encontrada");
      setResolvedBox(null);
      setBoxProducts([]);
    } finally {
      setBusy(false);
    }
  }

  function startConfirmProducts() {
    if (boxProducts.length === 0) return;
    setCurrentProductIdx(0);
    setProductCorrect(true);
    const firstQty = boxProducts[0].expectedQty ?? 0;
    setProductLines([{ quantity: firstQty, notes: "" }]);
    setProductNotes("");
    setConfirmedProducts([]);
    setCountsRegistered(false);
    setStep("CONFIRM");
  }

  function addLine() {
    setProductLines((prev) => [...prev, { quantity: 0, notes: "" }]);
  }

  function removeLine(idx: number) {
    if (productLines.length <= 1) return;
    setProductLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineQuantity(idx: number, qty: string) {
    setProductLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, quantity: parseFloat(qty || "0") } : line)),
    );
  }

  function updateLineNotes(idx: number, notes: string) {
    setProductLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, notes } : line)),
    );
  }

  function confirmCurrentProduct() {
    const product = boxProducts[currentProductIdx];
    const confirmed: ConfirmedProduct = {
      product,
      correct: productCorrect,
      lines: productCorrect ? productLines.filter((l) => l.quantity > 0) : [],
      notes: productNotes,
    };
    const updated = [...confirmedProducts, confirmed];
    setConfirmedProducts(updated);
    if (currentProductIdx < boxProducts.length - 1) {
      const nextIdx = currentProductIdx + 1;
      setCurrentProductIdx(nextIdx);
      setProductCorrect(true);
      const nextQty = boxProducts[nextIdx].expectedQty ?? 0;
      setProductLines([{ quantity: nextQty, notes: "" }]);
      setProductNotes("");
    } else {
      setStep("SUMMARY");
    }
  }

  function resetIdentify() {
    setSelectedBoxImportId("");
    setSelectedBoxPalletId("");
    setSelectedBoxId("");
    setPallets([]);
    setBoxes([]);
    setResolvedBox(null);
    setBoxProducts([]);
    setConfirmedProducts([]);
    setSkipPallet(false);
    setCurrentProductIdx(0);
    setProductLines([{ quantity: 0, notes: "" }]);
  }

  async function registerAllCounts(): Promise<boolean> {
    if (!session || confirmedProducts.length === 0) return false;
    if (!operator || !countedByOperatorId || countedByOperatorId === operator.id) {
      setToast("Selecciona el operario que contó las unidades");
      return false;
    }
    setBusy(true);
    try {
       const items = confirmedProducts.flatMap((cp) => {
         const lines = cp.correct ? cp.lines.filter((line) => line.quantity > 0) : [];
         if (lines.length === 0) {
           return [{
             productId: cp.product.productId,
             quantity: 0,
             notes: cp.notes || undefined,
             correct: cp.correct,
           }];
         }
         return lines.map((line) => ({
           productId: cp.product.productId,
           quantity: line.quantity,
           notes: line.notes || cp.notes || undefined,
           correct: cp.correct,
         }));
       });

      if (items.length > 0) {
          const payload = {
            operationId: crypto.randomUUID(),
            operatorId: operator?.id,
            countedByOperatorId,
          inputMethod: "MANUAL" as const,
          boxIdentity: {
            importCode: boxImport.trim(),
            palletNumber: boxPallet.trim() || undefined,
            boxNumber: resolvedBox?.number || "",
          },
          items,
        };

        const result = await apiFetchOffline<any>(
          `/api/sessions/v3/${id}/counts`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          {
            endpoint: `/api/sessions/v3/${id}/counts`,
            method: "POST",
            body: payload,
          },
        );

        if (result.queued) {
          setToast("Guardado offline — se sincronizará cuando haya conexión");
        } else {
          setToast("Conteos registrados");
        }
      } else {
        setToast("Conteos registrados");
      }
      setCountsRegistered(items.length > 0);
      return items.length > 0;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al registrar");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNextBox() {
    if (!countsRegistered) {
      const registered = await registerAllCounts();
      if (!registered) return;
    }
    resetIdentify();
    setStep("IDENTIFY");
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );
  if (!session)
    return <div className="py-16 text-center text-slate-500">Sesión no encontrada.</div>;

  if (!operator) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-4">
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-slate-500">{session.name}</p>
          <h1 className="text-xl font-bold">Identifícate</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tu nombre quedará registrado en cada lectura.
          </p>
        </div>
        <Card>
          <CardContent className="p-3 space-y-3">
            {offlineData.isOnline ? (
              <Input
                placeholder="Tu nombre"
                className="h-11 text-center text-lg"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleJoin();
                }}
                autoFocus
              />
            ) : (
              <SearchableSelect
                options={operators.map((item) => ({ value: item.id, label: item.name }))}
                value={selectedOperatorId}
                onChange={(value) => {
                  const selected = operators.find((item) => item.id === value);
                  setSelectedOperatorId(value);
                  setOperatorName(selected?.name ?? "");
                }}
                placeholder="Seleccionar operario sincronizado..."
                searchPlaceholder="Filtrar operarios..."
                emptyMessage="No hay operarios sincronizados"
              />
            )}
            <Button
              className="h-12 w-full"
              onClick={() => void handleJoin()}
              disabled={joining || (offlineData.isOnline ? !operatorName.trim() : !selectedOperatorId)}
            >
              {joining ? <LoaderCircle className="animate-spin" size={16} /> : null}
              Ingresar a la sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v3" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">{session.name}</h1>
          <p className="text-xs text-slate-400">{session.code}</p>
        </div>
        {!offlineData.isOnline && (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
            <WifiOff size={12} /> Offline
          </span>
        )}
        {hasOfflineData && offlineData.isOnline && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
            <Database size={12} /> Datos locales
          </span>
        )}
        {toast && (
          <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-600">
            {toast}
          </span>
        )}
      </div>

      {step === "IDENTIFY" && (
        <div className="space-y-3">
          {!hasOfflineData && !offlineData.isOnline && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <WifiOff size={16} />
                  <div>
                    <p className="text-sm font-medium">Sin datos offline</p>
                    <p className="text-xs text-amber-600">No hay datos descargados. Conéctese a internet y sincronice datos desde el botón de abajo a la derecha.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="relative z-20 overflow-visible">
            <CardContent className="relative z-20 min-h-[270px] space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Identificar caja</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400"
                    onClick={downloadBoxTemplate}
                  >
                    <FileSpreadsheet size={12} /> Plantilla
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importBusy}
                  >
                    {importBusy ? (
                      <LoaderCircle className="animate-spin" size={12} />
                    ) : (
                      <Upload size={12} />
                    )}{" "}
                    Importar
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => void handleBoxImport(e)}
                  />
                </div>
              </div>
              {importResult && (
                <p
                  className={`rounded px-2 py-1 text-xs ${importResult.startsWith("Error") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
                >
                  {importResult}
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Operario que contó las unidades
                </label>
                <SearchableSelect
                  options={operators
                    .filter((item) => item.id !== operator?.id)
                    .map((item) => ({ value: item.id, label: item.name }))}
                  value={countedByOperatorId}
                  onChange={setCountedByOperatorId}
                  placeholder="Seleccionar operario contador..."
                  searchPlaceholder="Filtrar operarios..."
                  disabled={!operator}
                  emptyMessage="No hay otro operario disponible"
                  allowCustom
                  onCreateOption={createCountedOperator}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Digitador: {operator?.name ?? "sin identificar"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Importación
                </label>
                <SearchableSelect
                  options={imports.map((imp) => ({
                    value: imp.id,
                    label: `${imp.code}${imp.description ? ` — ${imp.description}` : ""}`,
                  }))}
                  value={selectedBoxImportId}
                  onChange={(val) => void handleImportSelect(val)}
                  placeholder={loadingImports ? "Cargando..." : "Seleccionar importación..."}
                  searchPlaceholder="Filtrar importaciones..."
                  disabled={loadingImports}
                />
              </div>
              {selectedBoxImportId && !skipPallet && pallets.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Pallet
                  </label>
                  <SearchableSelect
                    options={pallets.map((p) => ({ value: p.id, label: p.number }))}
                    value={selectedBoxPalletId}
                    onChange={(val) => void handlePalletSelect(val)}
                    placeholder={loadingPallets ? "Cargando..." : "Seleccionar pallet..."}
                    searchPlaceholder="Filtrar pallets..."
                    disabled={loadingPallets}
                  />
                </div>
              )}
              {selectedBoxImportId &&
                (skipPallet || pallets.length === 0 || selectedBoxPalletId) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Caja
                    </label>
                    {loadingBoxes ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
                        <LoaderCircle className="animate-spin" size={14} /> Cargando...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={boxes.map((b) => ({ value: b.id, label: `Caja ${b.number}` }))}
                        value={selectedBoxId}
                        onChange={(val) => void handleBoxSelect(val)}
                        placeholder="Seleccionar caja..."
                        searchPlaceholder="Filtrar cajas..."
                      />
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
          {resolvedBox && (
            <Card className="border-teal-200">
              <CardContent className="p-3 space-y-3">
                <div>
                  <p className="text-sm font-bold text-teal-800">
                    {resolvedBox.import}
                    {resolvedBox.pallet ? ` / ${resolvedBox.pallet}` : ""} /{" "}
                    {resolvedBox.number}
                  </p>
                </div>
                <div className="space-y-2">
                  {boxProducts.map((bp) => (
                    <div
                      key={bp.productId}
                      className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{bp.productDescription}</p>
                        <p className="text-xs text-slate-400">
                          {bp.productCode}
                          {bp.supplierCode ? ` · Prov: ${bp.supplierCode}` : ""} ·{" "}
                          {bp.productUnit}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {bp.expectedQty ?? "?"} unds
                      </span>
                    </div>
                  ))}
                </div>
                <Button className="h-12 w-full" onClick={startConfirmProducts}>
                  <CheckCircle2 size={16} className="mr-1" /> Confirmar productos
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === "CONFIRM" && boxProducts[currentProductIdx] && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
            Producto {currentProductIdx + 1} de {boxProducts.length}
          </div>
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-base font-bold text-blue-800">
                  {boxProducts[currentProductIdx].productDescription}
                </p>
                <p className="text-sm text-blue-600">
                  {boxProducts[currentProductIdx].productCode}
                  {boxProducts[currentProductIdx].supplierCode
                    ? ` · Prov: ${boxProducts[currentProductIdx].supplierCode}`
                    : ""}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Unidad: {boxProducts[currentProductIdx].productUnit} · Esperado:{" "}
                  {boxProducts[currentProductIdx].expectedQty ?? "?"} unds
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setProductCorrect(true);
                    const qty = boxProducts[currentProductIdx].expectedQty ?? 0;
                    setProductLines([{ quantity: qty, notes: "" }]);
                  }}
                  className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium min-h-[48px] ${productCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}
                >
                  <CheckCircle2 size={16} className="inline mr-1" /> Correcto
                </button>
                <button
                  onClick={() => {
                    setProductCorrect(false);
                    setProductLines([]);
                  }}
                  className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium min-h-[48px] ${!productCorrect ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}
                >
                  <XCircle size={16} className="inline mr-1" /> Incorrecto
                </button>
              </div>
              {productCorrect && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500">
                      Líneas de cantidad
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-teal-600"
                      onClick={addLine}
                    >
                      + Agregar línea
                    </Button>
                  </div>
                  {productLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="h-11 text-lg flex-1"
                            placeholder={`Cantidad ${idx + 1}`}
                            value={line.quantity || ""}
                            onChange={(e) => updateLineQuantity(idx, e.target.value)}
                            min={0}
                          />
                          {productLines.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 px-2"
                              onClick={() => removeLine(idx)}
                            >
                              <XCircle size={16} />
                            </Button>
                          )}
                        </div>
                        <Input
                          className="h-9 text-xs"
                          placeholder="Observación línea (opcional)"
                          value={line.notes}
                          onChange={(e) => updateLineNotes(idx, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Total:{" "}
                    <span className="font-bold">
                      {productLines.reduce((s, l) => s + l.quantity, 0)}
                    </span>{" "}
                    unds
                    {boxProducts[currentProductIdx].expectedQty != null && (
                      <span>
                        {" "}
                        (esperado: {boxProducts[currentProductIdx].expectedQty})
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Observación general (opcional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-16 resize-none"
                  placeholder={
                    productCorrect
                      ? "Ej: empaque dañado..."
                      : "Ej: oxidado, producto equivocado..."
                  }
                  value={productNotes}
                  onChange={(e) => setProductNotes(e.target.value)}
                />
              </div>
              <Button className="h-12 w-full" onClick={confirmCurrentProduct}>
                {currentProductIdx < boxProducts.length - 1
                  ? "Siguiente producto"
                  : "Finalizar confirmación"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "SUMMARY" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <p className="text-sm font-medium text-slate-700">Resumen</p>
              {confirmedProducts.map((cp, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${cp.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{cp.product.productDescription}</p>
                    {cp.correct ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {cp.product.productCode} ·{" "}
                    {cp.lines.reduce((s, l) => s + l.quantity, 0)} unds
                  </p>
                  {cp.notes && (
                    <p className="text-xs text-slate-500 italic mt-1">
                      Obs: {cp.notes}
                    </p>
                  )}
                  {cp.correct && cp.lines.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {cp.lines.map((line, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs"
                        >
                          <span>Línea {j + 1}</span>
                          <span>
                            {line.quantity} unds
                            {line.notes && ` (${line.notes})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => void saveAndNextBox()}
              disabled={busy}
            >
              {busy && <LoaderCircle className="mr-1 animate-spin" size={16} />}
              Guardar y siguiente caja
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={() => void registerAllCounts()}
              disabled={busy || countsRegistered}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : countsRegistered ? (
                <CheckCircle2 size={16} />
              ) : (
                <Package size={16} />
              )}{" "}
              {countsRegistered ? "Información guardada" : "Guardar información"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
