"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, LoaderCircle, MapPin, Package, CheckCircle2, XCircle, ScanBarcode } from "lucide-react";
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

type BoxProduct = { productId: string; productCode: string; productDescription: string; productUnit: string; expectedQty: number | null };
type ConfirmedProduct = { product: BoxProduct; correct: boolean; quantity: number; notes: string; locations: LocationAssignment[] };
type LocationAssignment = { positionId: string; positionCode: string; quantity: number };
type Step = "IDENTIFY" | "CONFIRM" | "ASSIGN" | "SUMMARY";

export default function V2ScanPage() {
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
  const [productQty, setProductQty] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [confirmedProducts, setConfirmedProducts] = useState<ConfirmedProduct[]>([]);

  const [assignPositionCode, setAssignPositionCode] = useState("");
  const [assignQty, setAssignQty] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/sessions/v2/${id}`);
      setSession(data.session);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (step !== "IDENTIFY") return;
    (async () => {
      setLoadingImports(true);
      try {
        const data = await apiFetch<{ imports: { id: string; code: string; description: string | null }[] }>("/api/boxes/imports");
        setImports(data.imports);
      } catch { /* silent */ }
      finally { setLoadingImports(false); }
    })();
  }, [step]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);

  async function handleImportSelect(importId: string) {
    setSelectedBoxImportId(importId); setSelectedBoxPalletId(""); setSelectedBoxId("");
    setPallets([]); setBoxes([]); setResolvedBox(null); setBoxProducts([]); setSkipPallet(false);
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

  async function handlePalletSelect(palletId: string) {
    setSelectedBoxPalletId(palletId); setSelectedBoxId(""); setBoxes([]); setResolvedBox(null); setBoxProducts([]);
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

  async function handleBoxSelect(boxId: string) {
    setSelectedBoxId(boxId);
    if (!boxId) { setResolvedBox(null); setBoxProducts([]); return; }
    const bx = boxes.find(b => b.id === boxId);
    if (!bx) return;
    const p = new URLSearchParams({ import: boxImport.trim(), box: bx.number });
    if (boxPallet.trim()) p.set("pallet", boxPallet.trim());
    setBusy(true);
    try {
      const data = await apiFetch<any>(`/api/boxes/resolve?${p.toString()}`);
      setResolvedBox(data.box);
      setBoxProducts(data.box.products.map((pr: any) => ({
        productId: pr.productId, productCode: pr.productCode, productDescription: pr.productDescription,
        productUnit: pr.productUnit, expectedQty: pr.expectedQty,
      })));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Caja no encontrada");
      setResolvedBox(null); setBoxProducts([]);
    } finally { setBusy(false); }
  }

  function startConfirmProducts() {
    if (boxProducts.length === 0) return;
    setCurrentProductIdx(0); setProductCorrect(true);
    setProductQty(boxProducts[0].expectedQty?.toString() ?? "");
    setProductNotes(""); setConfirmedProducts([]); setStep("CONFIRM");
  }

  function confirmCurrentProduct() {
    const product = boxProducts[currentProductIdx];
    const confirmed: ConfirmedProduct = {
      product, correct: productCorrect,
      quantity: productCorrect ? parseFloat(productQty || "0") : 0,
      notes: productNotes, locations: [],
    };
    const updated = [...confirmedProducts, confirmed];
    setConfirmedProducts(updated);
    if (currentProductIdx < boxProducts.length - 1) {
      const nextIdx = currentProductIdx + 1;
      setCurrentProductIdx(nextIdx); setProductCorrect(true);
      setProductQty(boxProducts[nextIdx].expectedQty?.toString() ?? "");
      setProductNotes("");
    } else {
      const correctProducts = updated.filter(p => p.correct && p.quantity > 0);
      if (correctProducts.length > 0) {
        setCurrentProductIdx(0); setAssignQty(correctProducts[0].quantity.toString()); setStep("ASSIGN");
      } else { setStep("SUMMARY"); }
    }
  }

  function correctProducts() { return confirmedProducts.filter(p => p.correct && p.quantity > 0); }
  function assignedQtyForProduct(idx: number) {
    const cp = correctProducts()[idx];
    return cp ? cp.locations.reduce((s, l) => s + l.quantity, 0) : 0;
  }

  function resetIdentify() {
    setSelectedBoxImportId(""); setSelectedBoxPalletId(""); setSelectedBoxId("");
    setPallets([]); setBoxes([]); setResolvedBox(null); setBoxProducts([]);
    setConfirmedProducts([]); setSkipPallet(false); setCurrentProductIdx(0);
    setAssignPositionCode(""); setAssignQty("");
  }

  function assignLocation() {
    if (!assignPositionCode.trim()) return;
    const pos = session?.sessionPositions.find(sp => sp.position.code === assignPositionCode.trim());
    if (!pos) { setToast("Posición no encontrada en esta sesión"); return; }
    const qty = parseFloat(assignQty || "0");
    if (qty <= 0) { setToast("Cantidad debe ser positiva"); return; }
    const cp = correctProducts()[currentProductIdx];
    if (!cp) return;
    const updated = [...confirmedProducts];
    const realIdx = confirmedProducts.findIndex(c => c.product.productId === cp.product.productId);
    updated[realIdx] = { ...updated[realIdx], locations: [...updated[realIdx].locations, { positionId: pos.position.id, positionCode: pos.position.code, quantity: qty }] };
    setConfirmedProducts(updated);
    setAssignPositionCode("");
    const remaining = cp.quantity - assignedQtyForProduct(currentProductIdx) - qty;
    setAssignQty(remaining > 0 ? remaining.toString() : "");
    setToast(`Asignado ${qty} en ${pos.position.code}`);
  }

  function nextProductAssign() {
    if (currentProductIdx < correctProducts().length - 1) {
      const nextIdx = currentProductIdx + 1;
      setCurrentProductIdx(nextIdx);
      setAssignQty(correctProducts()[nextIdx].quantity.toString());
      setAssignPositionCode("");
    } else { setStep("SUMMARY"); }
  }

  async function registerAllCounts() {
    if (!session || confirmedProducts.length === 0) return;
    setBusy(true);
    try {
      for (const cp of correctProducts()) {
        for (const loc of cp.locations) {
          const roundRes = await apiFetch<any>(`/api/sessions/v2/${id}/positions/${loc.positionId}`, {
            method: "POST", body: JSON.stringify({ operationId: crypto.randomUUID() }),
          });
          await apiFetch<any>(`/api/sessions/v2/${id}/counts`, {
            method: "POST", body: JSON.stringify({
              operationId: crypto.randomUUID(), positionId: loc.positionId, countRoundId: roundRes.round.id,
              productCode: cp.product.productCode, quantity: loc.quantity, inputMethod: "MANUAL", notes: cp.notes || undefined,
            }),
          });
        }
      }
      setToast("Conteos registrados");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al registrar");
    } finally { setBusy(false); }
  }

  async function completeSession() {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v2/${id}`, { method: "PATCH", body: JSON.stringify({ status: "REVIEW" }) });
      setToast("Sesión enviada a revisión");
      await load();
    } catch (error) { setToast(error instanceof Error ? error.message : "Error"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!session) return <div className="py-16 text-center text-slate-500">Sesión no encontrada.</div>;

  const occupiedCount = session.sessionPositions.filter(sp => sp.rounds.length > 0).length;
  const totalPos = session.sessionPositions.length;
  const availablePositions = session.sessionPositions.filter(sp => sp.status !== "COMPLETED");

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v2" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">{session.name}</h1>
          <p className="text-xs text-slate-400">{session.code} · {occupiedCount}/{totalPos} posiciones</p>
        </div>
        {toast && <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-600">{toast}</span>}
      </div>

      {step === "IDENTIFY" && (
        <div className="space-y-3">
          <Card><CardContent className="p-3 space-y-3">
            <p className="text-sm font-medium text-slate-700">Identificar caja</p>
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
                {loadingBoxes ? <div className="flex items-center gap-2 py-3 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={14} /> Cargando...</div> : (
                  <select className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedBoxId} onChange={(e) => void handleBoxSelect(e.target.value)}>
                    <option value="">Seleccionar caja...</option>
                    {boxes.map((b) => <option key={b.id} value={b.id}>Caja {b.number}</option>)}
                  </select>
                )}
              </div>
            )}
          </CardContent></Card>
          {resolvedBox && (
            <Card className="border-teal-200"><CardContent className="p-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-teal-800">{resolvedBox.import}{resolvedBox.pallet ? ` / ${resolvedBox.pallet}` : ""} / {resolvedBox.number}</p>
                {resolvedBox.expectedPosition && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">Esperada: {resolvedBox.expectedPosition.code}</span>}
              </div>
              <div className="space-y-2">
                {boxProducts.map((bp) => (
                  <div key={bp.productId} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                    <div><p className="text-sm font-medium">{bp.productDescription}</p><p className="text-xs text-slate-400">{bp.productCode} · {bp.productUnit}</p></div>
                    <span className="text-xs text-slate-500">{bp.expectedQty ?? "?"} unds</span>
                  </div>
                ))}
              </div>
              <Button className="h-12 w-full" onClick={startConfirmProducts}><CheckCircle2 size={16} className="mr-1" /> Confirmar productos</Button>
            </CardContent></Card>
          )}
        </div>
      )}

      {step === "CONFIRM" && boxProducts[currentProductIdx] && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">Producto {currentProductIdx + 1} de {boxProducts.length}</div>
          <Card><CardContent className="p-3 space-y-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-base font-bold text-blue-800">{boxProducts[currentProductIdx].productDescription}</p>
              <p className="text-sm text-blue-600">{boxProducts[currentProductIdx].productCode}</p>
              <p className="text-xs text-slate-500 mt-1">Unidad: {boxProducts[currentProductIdx].productUnit} · Esperado: {boxProducts[currentProductIdx].expectedQty ?? "?"} unds</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setProductCorrect(true); setProductQty(boxProducts[currentProductIdx].expectedQty?.toString() ?? ""); }}
                className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium min-h-[48px] ${productCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}>
                <CheckCircle2 size={16} className="inline mr-1" /> Correcto
              </button>
              <button onClick={() => { setProductCorrect(false); setProductQty("0"); }}
                className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium min-h-[48px] ${!productCorrect ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"}`}>
                <XCircle size={16} className="inline mr-1" /> Incorrecto
              </button>
            </div>
            {productCorrect && (
              <div><label className="mb-1 block text-xs font-medium text-slate-500">Cantidad</label>
                <Input type="number" inputMode="decimal" className="h-11 text-lg" value={productQty} onChange={(e) => setProductQty(e.target.value)} min={0} /></div>
            )}
            <div><label className="mb-1 block text-xs font-medium text-slate-500">Observación (opcional)</label>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-16 resize-none"
                placeholder={productCorrect ? "Ej: empaque dañado..." : "Ej: oxidado, producto equivocado..."} value={productNotes} onChange={(e) => setProductNotes(e.target.value)} /></div>
            <Button className="h-12 w-full" onClick={confirmCurrentProduct}>
              {currentProductIdx < boxProducts.length - 1 ? "Siguiente producto" : "Finalizar confirmación"}
            </Button>
          </CardContent></Card>
        </div>
      )}

      {step === "ASSIGN" && correctProducts()[currentProductIdx] && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
            Ubicando: {correctProducts()[currentProductIdx].product.productDescription} ({currentProductIdx + 1}/{correctProducts().length})
          </div>
          <Card><CardContent className="p-3 space-y-3">
            <p className="text-sm font-medium text-slate-700">Asignar ubicación</p>
            <p className="text-xs text-slate-500">Cantidad total: {correctProducts()[currentProductIdx].quantity} · Asignada: {assignedQtyForProduct(currentProductIdx)} · Restante: {correctProducts()[currentProductIdx].quantity - assignedQtyForProduct(currentProductIdx)}</p>
            <div className="flex gap-2">
              <Input placeholder="Código posición" className="h-11 flex-1" value={assignPositionCode} onChange={(e) => setAssignPositionCode(e.target.value.toUpperCase())} />
              <Input type="number" inputMode="decimal" placeholder="Cant." className="h-11 w-24" value={assignQty} onChange={(e) => setAssignQty(e.target.value)} min={0} />
            </div>
            <Button className="h-12 w-full" onClick={assignLocation} disabled={!assignPositionCode.trim() || parseFloat(assignQty || "0") <= 0}>
              <MapPin size={16} className="mr-1" /> Asignar aquí
            </Button>
            {availablePositions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Posiciones disponibles</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {availablePositions.map((sp) => (
                    <button key={sp.id} onClick={() => { setAssignPositionCode(sp.position.code); }}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left min-h-[44px] ${assignPositionCode === sp.position.code ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sp.position.code}</p>
                        <p className="text-xs text-slate-400 truncate">{sp.position.rack.zone.floor.name} / {sp.position.rack.name}</p>
                      </div>
                      <ScanBarcode size={14} className="shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent></Card>
          {correctProducts()[currentProductIdx].locations.length > 0 && (
            <Card><CardContent className="p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">Ubicaciones asignadas</p>
              {correctProducts()[currentProductIdx].locations.map((loc, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-green-50 px-3 py-2 text-sm">
                  <span className="font-medium">{loc.positionCode}</span><span className="text-green-700">{loc.quantity} unds</span>
                </div>
              ))}
            </CardContent></Card>
          )}
          {correctProducts()[currentProductIdx].quantity - assignedQtyForProduct(currentProductIdx) <= 0 && (
            <Button className="h-12 w-full" variant="outline" onClick={nextProductAssign}>
              {currentProductIdx < correctProducts().length - 1 ? "Siguiente producto" : "Ver resumen"}
            </Button>
          )}
        </div>
      )}

      {step === "SUMMARY" && (
        <div className="space-y-3">
          <Card><CardContent className="p-3 space-y-3">
            <p className="text-sm font-medium text-slate-700">Resumen</p>
            {confirmedProducts.map((cp, i) => (
              <div key={i} className={`rounded-lg border p-3 ${cp.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{cp.product.productDescription}</p>
                  {cp.correct ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                </div>
                <p className="text-xs text-slate-500">{cp.product.productCode} · {cp.quantity} unds</p>
                {cp.notes && <p className="text-xs text-slate-500 italic mt-1">Obs: {cp.notes}</p>}
                {cp.correct && cp.locations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {cp.locations.map((loc, j) => (
                      <div key={j} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs">
                        <span className="font-medium">{loc.positionCode}</span><span>{loc.quantity} unds</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent></Card>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => { resetIdentify(); setStep("IDENTIFY"); }}>Siguiente caja</Button>
            <Button className="flex-1 h-12" onClick={() => void registerAllCounts()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Package size={16} />} Registrar todo
            </Button>
          </div>
          <Button className="w-full h-12" variant="destructive" onClick={() => void completeSession()} disabled={busy}>Finalizar sesión</Button>
        </div>
      )}
    </div>
  );
}
