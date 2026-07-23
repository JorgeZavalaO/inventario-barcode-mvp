"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, ScanBarcode, MapPin, Package, CheckCircle2, LoaderCircle, AlertTriangle, SquareStack, RotateCcw, Camera, Warehouse, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionData = {
  id: string; code: string; name: string; status: string;
  sessionPositions: {
    id: string; status: string;
    position: { id: string; code: string; rack: { code: string; name: string; zone: { floor: { name: string } } }; compartment: { name: string }; depthSlot: { name: string } };
    rounds: { id: string; roundNumber: number; status: string }[];
  }[];
};

type BoxProduct = { productId: string; productCode: string; productDescription: string; productUnit: string; quantity: string };

export default function V2ScanPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePosition, setActivePosition] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [usePackage, setUsePackage] = useState(false);
  const [packageCount, setPackageCount] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [looseQty, setLooseQty] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoReason, setUndoReason] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [countMode, setCountMode] = useState<"box" | "legacy">("box");
  const [boxImport, setBoxImport] = useState("");
  const [boxPallet, setBoxPallet] = useState("");
  const [boxNumber, setBoxNumber] = useState("");
  const [resolvedBox, setResolvedBox] = useState<any>(null);
  const [boxProducts, setBoxProducts] = useState<BoxProduct[]>([]);
  const [imports, setImports] = useState<{ id: string; code: string; description: string | null }[]>([]);
  const [pallets, setPallets] = useState<{ id: string; number: string }[]>([]);
  const [boxes, setBoxes] = useState<{ id: string; number: string }[]>([]);
  const [selectedBoxImportId, setSelectedBoxImportId] = useState("");
  const [selectedBoxPalletId, setSelectedBoxPalletId] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [loadingImports, setLoadingImports] = useState(false);
  const [loadingPallets, setLoadingPallets] = useState(false);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [skipPallet, setSkipPallet] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/sessions/v2/${id}`);
      setSession(data.session);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    async function loadImports() {
      setLoadingImports(true);
      try {
        const data = await apiFetch<{ imports: { id: string; code: string; description: string | null }[] }>("/api/boxes/imports");
        setImports(data.imports);
      } catch { /* silent */ }
      finally { setLoadingImports(false); }
    }
    if (activePosition) void loadImports();
  }, [activePosition]);

  async function handleImportSelect(importId: string) {
    setSelectedBoxImportId(importId);
    setSelectedBoxPalletId("");
    setSelectedBoxId("");
    setPallets([]);
    setBoxes([]);
    setResolvedBox(null);
    setBoxProducts([]);
    setSkipPallet(false);
    if (!importId) return;
    const imp = imports.find(i => i.id === importId);
    if (imp) setBoxImport(imp.code);
    setLoadingPallets(true);
    try {
      const data = await apiFetch<{ pallets: { id: string; number: string }[] }>(`/api/boxes/pallets?importId=${importId}`);
      setPallets(data.pallets);
      if (data.pallets.length === 0) setSkipPallet(true);
    } catch { /* silent */ }
    finally { setLoadingPallets(false); }
  }

  async function loadBoxesForImport(importId: string) {
    setLoadingBoxes(true);
    try {
      const data = await apiFetch<{ boxes: { id: string; number: string }[] }>(`/api/boxes/boxes?importId=${importId}`);
      setBoxes(data.boxes);
    } catch { /* silent */ }
    finally { setLoadingBoxes(false); }
  }

  async function handlePalletSelect(palletId: string) {
    setSelectedBoxPalletId(palletId);
    setSelectedBoxId("");
    setBoxes([]);
    setResolvedBox(null);
    setBoxProducts([]);
    if (!palletId) { setSkipPallet(false); return; }
    const pal = pallets.find(p => p.id === palletId);
    if (pal) setBoxPallet(pal.number);
    setLoadingBoxes(true);
    try {
      const data = await apiFetch<{ boxes: { id: string; number: string }[] }>(`/api/boxes/boxes?palletId=${palletId}`);
      setBoxes(data.boxes);
    } catch { /* silent */ }
    finally { setLoadingBoxes(false); }
  }

  function handleBoxSelect(boxId: string) {
    setSelectedBoxId(boxId);
    if (!boxId) { setResolvedBox(null); setBoxProducts([]); return; }
    const bx = boxes.find(b => b.id === boxId);
    if (bx) {
      setBoxNumber(bx.number);
      void resolveBox(boxImport, boxPallet || "", bx.number);
    }
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);

  async function startPosition(positionId: string) {
    setBusy(true);
    try {
      const result = await apiFetch<any>(`/api/sessions/v2/${id}/positions/${positionId}`, {
        method: "POST",
        body: JSON.stringify({ operationId: crypto.randomUUID() }),
      });
      setActivePosition(result.position);
      setActiveRound(result.round);
      setEvents([]);
      setToast("Posición iniciada");
    } catch { setToast("Error al iniciar posición"); }
    finally { setBusy(false); }
  }

  function handleScanInput(value: string) {
    setScannedCode(value);
  }

  async function resolveBox(importCode: string, palletNumber: string, boxNum: string) {
    if (!importCode.trim() || !boxNum.trim()) return;
    const params = new URLSearchParams({ import: importCode.trim(), box: boxNum.trim() });
    if (palletNumber.trim()) params.set("pallet", palletNumber.trim());
    setBusy(true);
    try {
      const data = await apiFetch<any>(`/api/boxes/resolve?${params.toString()}`);
      setResolvedBox(data.box);
      setBoxProducts(data.box.products.map((p: any) => ({ productId: p.productId, productCode: p.productCode, productDescription: p.productDescription, productUnit: p.productUnit, quantity: "" })));
      setToast(`Caja encontrada: ${data.box.products.length} producto(s)`);
    } catch (error) {
      setResolvedBox(null);
      setBoxProducts([]);
      setToast(error instanceof Error ? error.message : "Caja no encontrada");
    } finally { setBusy(false); }
  }

  async function registerBoxCount() {
    if (!activeRound || !resolvedBox || boxProducts.length === 0) return;
    if (boxProducts.some((p) => !p.quantity || parseFloat(p.quantity) <= 0)) { setToast("Todas las cantidades deben ser positivas"); return; }
    setBusy(true);
    const operationId = crypto.randomUUID();
    try {
      const result = await apiFetch<any>(`/api/sessions/v2/${id}/counts`, {
        method: "POST",
        body: JSON.stringify({
          operationId,
          positionId: activePosition.id,
          countRoundId: activeRound.id,
          inputMethod: "MANUAL",
          boxIdentity: { importCode: boxImport.trim(), palletNumber: boxPallet.trim() || undefined, boxNumber: boxNumber.trim() },
          items: boxProducts.map((p) => ({ productId: p.productId, quantity: parseFloat(p.quantity) })),
        }),
      });
      setEvents((prev) => [...prev, ...result.eventIds.map((_: string, i: number) => ({ eventId: result.eventIds[i], productCode: boxProducts[i].productCode, quantity: parseFloat(boxProducts[i].quantity), productDescription: boxProducts[i].productDescription }))]);
      setResolvedBox(null); setBoxProducts([]);
      setBoxNumber(""); setSelectedBoxId("");
      setToast("Caja registrada");
      inputRef.current?.focus();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al registrar caja");
    } finally { setBusy(false); }
  }

  async function registerCount() {
    if (!activeRound || !scannedCode.trim()) return;
    const qty = usePackage
      ? (parseFloat(packageCount || "0") * parseFloat(unitsPerPackage || "0")) + parseFloat(looseQty || "0")
      : parseFloat(quantity || "0");
    if (qty <= 0) { setToast("Cantidad debe ser positiva"); return; }
    setBusy(true);
    try {
      const result = await apiFetch<any>(`/api/sessions/v2/${id}/counts`, {
        method: "POST",
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          positionId: activePosition.id,
          countRoundId: activeRound.id,
          productCode: scannedCode,
          packageCount: usePackage ? parseFloat(packageCount || "0") : undefined,
          unitsPerPackage: usePackage ? parseFloat(unitsPerPackage || "0") : undefined,
          looseQuantity: usePackage ? parseFloat(looseQty || "0") : undefined,
          quantity: qty,
          inputMethod: "MANUAL",
        }),
      });
      setEvents((prev) => [...prev, { eventId: result.eventId, productCode: scannedCode, quantity: qty }]);
      setScannedCode("");
      setPackageCount(""); setUnitsPerPackage(""); setLooseQty(""); setQuantity("");
      setToast("Conteo registrado");
      inputRef.current?.focus();
    } catch { setToast("Error al registrar"); }
    finally { setBusy(false); }
  }

  async function undoLastEvent() {
    if (events.length === 0 || !undoReason.trim()) return;
    const last = events[events.length - 1];
    setBusy(true);
    try {
      await apiFetch(`/api/counts/${last.eventId}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason: undoReason }),
      });
      setEvents((prev) => prev.filter((_, i) => i !== prev.length - 1));
      setShowUndo(false); setUndoReason("");
      setToast("Último conteo anulado");
    } catch { setToast("Error al anular"); }
    finally { setBusy(false); }
  }

  async function completePosition() {
    if (!activeRound) return;
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v2/${id}/positions/${activePosition.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ roundId: activeRound.id, operationId: crypto.randomUUID(), emptyConfirmed: events.length === 0 }),
      });
      setActivePosition(null); setActiveRound(null); setEvents([]);
      setSelectedBoxImportId(""); setSelectedBoxPalletId(""); setSelectedBoxId(""); setPallets([]); setBoxes([]);
      setResolvedBox(null); setBoxProducts([]); setSkipPallet(false);
      setToast("Posición completada");
      await load();
    } catch { setToast("Error al completar"); }
    finally { setBusy(false); }
  }

  function cancelPosition() {
    setActivePosition(null); setActiveRound(null); setEvents([]);
    setSelectedBoxImportId(""); setSelectedBoxPalletId(""); setSelectedBoxId(""); setPallets([]); setBoxes([]);
    setResolvedBox(null); setBoxProducts([]); setSkipPallet(false);
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!session) return <div className="py-16 text-center text-slate-500">Sesión no encontrada.</div>;

  const pendingPositions = session.sessionPositions.filter((p) => p.status === "PENDING" || p.status === "ASSIGNED");
  const inProgressPositions = session.sessionPositions.filter((p) => p.status === "IN_PROGRESS");
  const completedPositions = session.sessionPositions.filter((p) => p.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/sessions/v2" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">{session.name}</h1>
          <p className="text-xs text-slate-400">{session.code} · {completedPositions.length}/{session.sessionPositions.length}</p>
        </div>
        {toast && <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-600">{toast}</span>}
      </div>

      {!activePosition ? (
        <div className="space-y-3 px-4 pb-4">
          {inProgressPositions.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-medium text-amber-700">En progreso ({inProgressPositions.length})</p>
              <div className="space-y-2">
                {inProgressPositions.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 p-3">
                    <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{sp.position.code}</p>
                      <p className="text-xs text-slate-400 truncate">{sp.position.rack.zone.floor.name} / {sp.position.rack.name}</p>
                    </div>
                    <Button size="sm" className="shrink-0 h-11 px-4" onClick={() => void startPosition(sp.position.id)} disabled={busy}>
                      Reanudar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingPositions.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Pendientes ({pendingPositions.length})</p>
              <div className="space-y-2">
                {pendingPositions.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{sp.position.code}</p>
                      <p className="text-xs text-slate-400 truncate">{sp.position.rack.zone.floor.name} / {sp.position.rack.name}</p>
                    </div>
                    <Button size="sm" className="shrink-0 h-11 px-4" onClick={() => void startPosition(sp.position.id)} disabled={busy}>
                      <ScanBarcode size={14} /> Iniciar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedPositions.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Completadas ({completedPositions.length})</p>
              <div className="space-y-1">
                {completedPositions.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2 text-xs">
                    <CheckCircle2 size={12} className="text-teal-500" />
                    <span className="font-medium truncate">{sp.position.code}</span>
                    <span className="text-slate-400 truncate">{sp.position.compartment.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingPositions.length === 0 && inProgressPositions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Todas las posiciones están completadas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-24">
          <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-3">
            <div className="flex items-center gap-3">
              <MapPin className="text-teal-600" size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-teal-800 text-base">{activePosition.code}</p>
                <p className="text-xs text-teal-600 truncate">{activePosition.path}</p>
              </div>
              <span className="shrink-0 rounded-full bg-teal-200 px-2 py-0.5 text-xs font-medium text-teal-800">
                Ronda {activeRound.number}
              </span>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
            <button onClick={() => setCountMode("box")} className={`flex-1 rounded-md py-2.5 text-sm font-medium min-h-[44px] ${countMode === "box" ? "bg-teal-600 text-white" : "text-slate-600"}`}>
              <Package size={14} className="inline mr-1" /> Caja
            </button>
            <button onClick={() => setCountMode("legacy")} className={`flex-1 rounded-md py-2.5 text-sm font-medium min-h-[44px] ${countMode === "legacy" ? "bg-teal-600 text-white" : "text-slate-600"}`}>
              <ScanBarcode size={14} className="inline mr-1" /> Producto
            </button>
          </div>

          <Card>
            <CardContent className="p-3">
              {countMode === "box" ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Importación</label>
                    <select className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedBoxImportId} onChange={(e) => void handleImportSelect(e.target.value)} disabled={loadingImports}>
                      <option value="">{loadingImports ? "Cargando..." : "Seleccionar importación..."}</option>
                      {imports.map((imp) => <option key={imp.id} value={imp.id}>{imp.code}{imp.description ? ` — ${imp.description}` : ""}</option>)}
                    </select>
                  </div>

                  {selectedBoxImportId && !skipPallet && pallets.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Pallet</label>
                      <select className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedBoxPalletId} onChange={(e) => void handlePalletSelect(e.target.value)} disabled={loadingPallets}>
                        <option value="">{loadingPallets ? "Cargando..." : "Seleccionar pallet..."}</option>
                        {pallets.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}
                      </select>
                    </div>
                  )}

                  {selectedBoxImportId && (skipPallet || pallets.length === 0 || selectedBoxPalletId) && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Caja</label>
                      {loadingBoxes ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={14} /> Cargando cajas...</div>
                      ) : (
                        <select className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedBoxId} onChange={(e) => handleBoxSelect(e.target.value)}>
                          <option value="">Seleccionar caja...</option>
                          {boxes.map((b) => <option key={b.id} value={b.id}>Caja {b.number}</option>)}
                        </select>
                      )}
                    </div>
                  )}

                  {resolvedBox && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-3">
                      <div>
                        <p className="text-sm font-bold text-teal-800">
                          {resolvedBox.import}{resolvedBox.pallet ? ` / ${resolvedBox.pallet}` : ""} / {resolvedBox.number}
                        </p>
                        {resolvedBox.expectedPosition && activePosition && resolvedBox.expectedPosition.code === activePosition.code && (
                          <span className="inline-block mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Esta posición</span>
                        )}
                        {resolvedBox.expectedPosition && activePosition && resolvedBox.expectedPosition.code !== activePosition.code && (
                          <span className="inline-block mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Esperada: {resolvedBox.expectedPosition.code}</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {boxProducts.map((bp, i) => (
                          <div key={bp.productId} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{bp.productDescription}</p>
                              <p className="text-xs text-slate-500">{bp.productCode} · {bp.productUnit}</p>
                            </div>
                            <Input className="w-24 text-right h-11" placeholder="Cant." type="number" inputMode="decimal" value={bp.quantity} onChange={(e) => setBoxProducts((prev) => prev.map((p, j) => j === i ? { ...p, quantity: e.target.value } : p))} min={0} />
                          </div>
                        ))}
                      </div>
                      <Button className="h-12 w-full text-base" onClick={() => void registerBoxCount()} disabled={busy || boxProducts.some((p) => !p.quantity || parseFloat(p.quantity) <= 0)}>
                        {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Package size={16} />} Registrar caja
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input ref={inputRef} placeholder="Código de producto" value={scannedCode} onChange={(e) => handleScanInput(e.target.value)} className="h-11" />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setUsePackage(!usePackage)} className={`min-h-[44px] ${usePackage ? "bg-teal-50" : ""}`}>
                      <SquareStack size={14} /> {usePackage ? "Cajas + sueltos" : "Cantidad directa"}
                    </Button>
                  </div>
                  {usePackage ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Cajas" type="number" inputMode="numeric" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} min={0} className="h-11" />
                        <Input placeholder="Unds/caja" type="number" inputMode="numeric" value={unitsPerPackage} onChange={(e) => setUnitsPerPackage(e.target.value)} min={0} className="h-11" />
                        <Input placeholder="Sueltas" type="number" inputMode="numeric" value={looseQty} onChange={(e) => setLooseQty(e.target.value)} min={0} className="h-11" />
                      </div>
                      {packageCount && unitsPerPackage && (
                        <p className="text-xs text-slate-500">Total: {parseFloat(packageCount || "0") * parseFloat(unitsPerPackage || "0") + parseFloat(looseQty || "0")} unidades</p>
                      )}
                    </>
                  ) : (
                    <Input placeholder="Cantidad" type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0} className="h-11" />
                  )}
                  <Button className="h-12 w-full text-base" onClick={() => void registerCount()} disabled={busy || !scannedCode.trim()}>
                    {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Package size={16} />} Registrar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {events.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Conteos ({events.length})</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium truncate">{ev.productCode}</span>
                      <span className="text-slate-600 shrink-0">{ev.quantity} unds</span>
                    </div>
                  ))}
                </div>
                <p className="border-t mt-2 pt-2 text-right text-xs font-medium text-slate-600">
                  Total: {events.reduce((s, e) => s + e.quantity, 0)} unidades
                </p>
                {!showUndo ? (
                  <Button size="sm" variant="outline" className="mt-2 w-full min-h-[44px]" onClick={() => setShowUndo(true)}>
                    <RotateCcw size={12} /> Deshacer último
                  </Button>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Input placeholder="Motivo de anulación" value={undoReason} onChange={(e) => setUndoReason(e.target.value)} className="h-11" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => void undoLastEvent()} disabled={busy || !undoReason.trim()}>Confirmar</Button>
                      <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => { setShowUndo(false); setUndoReason(""); }}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t border-slate-200 bg-white p-3">
            <Button variant="destructive" className="min-h-[48px] px-4" onClick={cancelPosition}>Cancelar</Button>
            <Button className="ml-auto min-h-[48px] px-6 text-base" onClick={() => void completePosition()} disabled={busy}>
              <CheckCircle2 size={16} className="mr-1" /> {events.length === 0 ? "Vacío" : "Completar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
