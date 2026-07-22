"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, ScanBarcode, MapPin, Package, CheckCircle2, LoaderCircle, AlertTriangle, SquareStack, RotateCcw, Camera } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionData = {
  id: string;
  code: string;
  name: string;
  status: string;
  sessionPositions: {
    id: string; status: string;
    position: { id: string; code: string; rack: { code: string; name: string; zone: { floor: { name: string } } }; compartment: { name: string }; depthSlot: { name: string } };
    rounds: { id: string; roundNumber: number; status: string }[];
  }[];
};

export default function V2ScanPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePosition, setActivePosition] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [packageCount, setPackageCount] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");
  const [looseQty, setLooseQty] = useState("");
  const [quantity, setQuantity] = useState("");
  const [usePackage, setUsePackage] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoReason, setUndoReason] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastScannedType, setLastScannedType] = useState<"product" | "location" | "unknown">("unknown");
  const [countMode, setCountMode] = useState<"box" | "legacy">("box");
  const [boxImport, setBoxImport] = useState("");
  const [boxPallet, setBoxPallet] = useState("");
  const [boxNumber, setBoxNumber] = useState("");
  const [resolvedBox, setResolvedBox] = useState<any>(null);
  const [boxProducts, setBoxProducts] = useState<{ productId: string; productCode: string; productDescription: string; productUnit: string; quantity: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/sessions/v2/${id}`);
      setSession(data.session);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
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
    if (value.startsWith("LOC:")) {
      setLastScannedType("location");
      setToast("Código de ubicación detectado. Escanea un producto para contar.");
    } else if (value.trim().length > 0) {
      setLastScannedType("product");
    } else {
      setLastScannedType("unknown");
    }
  }

  async function resolveBox(importCode: string, palletNumber: string, boxNum: string) {
    if (!importCode.trim() || !palletNumber.trim() || !boxNum.trim()) return;
    setBusy(true);
    try {
      const data = await apiFetch<any>(`/api/boxes/resolve?import=${encodeURIComponent(importCode.trim())}&pallet=${encodeURIComponent(palletNumber.trim())}&box=${encodeURIComponent(boxNum.trim())}`);
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
          boxIdentity: { importCode: boxImport.trim(), palletNumber: boxPallet.trim(), boxNumber: boxNumber.trim() },
          items: boxProducts.map((p) => ({ productId: p.productId, quantity: parseFloat(p.quantity) })),
        }),
      });
      setEvents((prev) => [...prev, ...result.eventIds.map((_: string, i: number) => ({ eventId: result.eventIds[i], productCode: boxProducts[i].productCode, quantity: parseFloat(boxProducts[i].quantity), productDescription: boxProducts[i].productDescription }))]);
      setResolvedBox(null); setBoxProducts([]);
      setBoxNumber("");
      setToast("Caja registrada");
      inputRef.current?.focus();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al registrar caja");
    } finally { setBusy(false); }
  }

  async function registerCount() {
    if (!activeRound || !scannedCode.trim()) return;

    if (scannedCode.startsWith("LOC:")) {
      setToast("Escanea un producto, no una ubicación");
      setScannedCode("");
      return;
    }

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
      setToast("Posición completada");
      await load();
    } catch { setToast("Error al completar"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!session) return <div className="py-16 text-center text-slate-500">Sesión no encontrada.</div>;

  const pendingPositions = session.sessionPositions.filter((p) => p.status === "PENDING" || p.status === "ASSIGNED");
  const completedPositions = session.sessionPositions.filter((p) => p.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{session.name}</h1>
          <p className="text-xs text-slate-400">V2 · {session.code} · {session.status}</p>
        </div>
        {toast && <span className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-600">{toast}</span>}
      </div>

      {!activePosition ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Posiciones pendientes</CardTitle><CardDescription>{pendingPositions.length} por contar</CardDescription></CardHeader>
            <CardContent className="max-h-80 space-y-2 overflow-y-auto">
              {pendingPositions.length === 0 ? (
                <p className="text-sm text-slate-400">Todas las posiciones están completadas.</p>
              ) : pendingPositions.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium">{sp.position.code}</p>
                    <p className="text-xs text-slate-400">{sp.position.rack.zone.floor.name} / {sp.position.rack.name}</p>
                  </div>
                  <Button size="sm" onClick={() => void startPosition(sp.position.id)} disabled={busy}>
                    <ScanBarcode size={14} /> Iniciar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completadas</CardTitle><CardDescription>{completedPositions.length} posiciones</CardDescription></CardHeader>
            <CardContent className="max-h-80 space-y-1 overflow-y-auto">
              {completedPositions.length === 0 ? (
                <p className="text-sm text-slate-400">Ninguna completada aún.</p>
              ) : completedPositions.map((sp) => (
                <div key={sp.id} className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2 text-xs">
                  <CheckCircle2 size={12} className="text-teal-500" />
                  <span className="font-medium">{sp.position.code}</span>
                  <span className="text-slate-400">{sp.position.compartment.name} · {sp.position.depthSlot.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-teal-200 bg-teal-50">
            <CardContent className="flex items-center gap-3 py-3">
              <MapPin className="text-teal-600" size={20} />
              <div className="flex-1">
                <p className="font-bold text-teal-800">{activePosition.code}</p>
                <p className="text-xs text-teal-600">{activePosition.path}</p>
              </div>
              <span className="rounded bg-teal-200 px-2 py-0.5 text-xs font-medium text-teal-800">
                Ronda {activeRound.number}
              </span>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm"><Package size={14} /> Registrar conteo</CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant={countMode === "box" ? "default" : "outline"} onClick={() => setCountMode("box")}>Caja</Button>
                    <Button size="sm" variant={countMode === "legacy" ? "default" : "outline"} onClick={() => setCountMode("legacy")}>Producto</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {countMode === "box" ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Importación" value={boxImport} onChange={(e) => { setBoxImport(e.target.value); setResolvedBox(null); setBoxProducts([]); }} />
                      <Input placeholder="Pallet" value={boxPallet} onChange={(e) => { setBoxPallet(e.target.value); setResolvedBox(null); setBoxProducts([]); }} />
                      <Input placeholder="Caja" value={boxNumber} onChange={(e) => { setBoxNumber(e.target.value); if (boxImport.trim() && boxPallet.trim() && e.target.value.trim()) { void resolveBox(boxImport, boxPallet, e.target.value); } else { setResolvedBox(null); setBoxProducts([]); } }} />
                    </div>
                    {resolvedBox && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                        <p className="mb-2 text-xs font-medium text-teal-700">
                          {resolvedBox.import} / {resolvedBox.pallet} / {resolvedBox.number}
                          {resolvedBox.expectedPosition && <span className="ml-2 font-normal text-teal-500">Esperada: {resolvedBox.expectedPosition.code}</span>}
                        </p>
                        <div className="space-y-2">
                          {boxProducts.map((bp, i) => (
                            <div key={bp.productId} className="flex items-center gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{bp.productDescription}</p>
                                <p className="text-xs text-slate-500">{bp.productCode} · {bp.productUnit}</p>
                              </div>
                              <Input className="w-24 text-right" placeholder="Cant." type="number" value={bp.quantity} onChange={(e) => setBoxProducts((prev) => prev.map((p, j) => j === i ? { ...p, quantity: e.target.value } : p))} min={0} />
                            </div>
                          ))}
                        </div>
                        <Button className="mt-3 w-full" onClick={() => void registerBoxCount()} disabled={busy || boxProducts.some((p) => !p.quantity || parseFloat(p.quantity) <= 0)}>
                          {busy ? <LoaderCircle className="animate-spin" size={14} /> : <Package size={14} />} Registrar caja
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input ref={inputRef} placeholder="Código de producto" value={scannedCode} onChange={(e) => handleScanInput(e.target.value)} className="flex-1" />
                      {lastScannedType === "product" && <span className="flex items-center rounded bg-teal-100 px-2 text-xs text-teal-700"><Package size={12} className="mr-1" /> Producto</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setUsePackage(!usePackage)} className={usePackage ? "bg-teal-50" : ""}>
                        <SquareStack size={14} /> {usePackage ? "Cajas + sueltos" : "Cantidad directa"}
                      </Button>
                    </div>
                    {usePackage ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <Input placeholder="Cajas" type="number" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} min={0} />
                          <Input placeholder="Unds/caja" type="number" value={unitsPerPackage} onChange={(e) => setUnitsPerPackage(e.target.value)} min={0} />
                          <Input placeholder="Sueltas" type="number" value={looseQty} onChange={(e) => setLooseQty(e.target.value)} min={0} />
                        </div>
                        {packageCount && unitsPerPackage && (
                          <p className="text-xs text-slate-500">Total: {parseFloat(packageCount || "0") * parseFloat(unitsPerPackage || "0") + parseFloat(looseQty || "0")} unidades</p>
                        )}
                      </>
                    ) : (
                      <Input placeholder="Cantidad" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0} />
                    )}
                    <Button className="w-full" onClick={() => void registerCount()} disabled={busy || !scannedCode.trim()}>
                      {busy ? <LoaderCircle className="animate-spin" size={14} /> : <Package size={14} />} Registrar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Conteos de esta posición</CardTitle></CardHeader>
              <CardContent className="max-h-60 space-y-1 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin conteos aún.</p>
                ) : events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">{ev.productCode}</span>
                    <span className="text-slate-600">{ev.quantity} unds</span>
                  </div>
                ))}
                {events.length > 0 && (
                  <>
                    <p className="border-t pt-2 text-right text-xs font-medium text-slate-600">
                      Total: {events.reduce((s, e) => s + e.quantity, 0)} unidades
                    </p>
                    {!showUndo ? (
                      <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setShowUndo(true)}>
                        <RotateCcw size={12} /> Deshacer último
                      </Button>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <Input placeholder="Motivo de anulación" value={undoReason} onChange={(e) => setUndoReason(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => void undoLastEvent()} disabled={busy || !undoReason.trim()}>
                            Confirmar anulación
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowUndo(false); setUndoReason(""); }}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => { setActivePosition(null); setActiveRound(null); setEvents([]); }}>
              Cancelar
            </Button>
            <Button className="ml-auto" onClick={() => void completePosition()} disabled={busy}>
              <CheckCircle2 size={14} /> {events.length === 0 ? "Confirmar vacío" : "Completar posición"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
