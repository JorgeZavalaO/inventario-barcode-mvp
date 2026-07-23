"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { compartmentHasProtectedUse, rectsOverlap } from "@/lib/rack-validation";
import { ArrowLeft, Layers, LoaderCircle, Save, Trash2, Undo2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveRackDesigner, type DesignerCompartment } from "@/components/locations/interactive-rack-designer";

type DraftCompartment = DesignerCompartment & { active?: boolean; positions?: { id: string; locationStocks?: { id: string }[]; sessionPositions?: { id: string }[] }[] };
type RackData = { id: string; name: string; widthMm: number | null; heightMm: number | null; version: number };
type RackResponse = { rack: RackData };
type CompartmentsResponse = { compartments: DraftCompartment[] };

function geometry(compartments: DraftCompartment[]) {
  return compartments.map(({ id, code, name, x, y, width, height, columnCount, stackLevels, depthSlots, moduleLabel, levelLabel }) => ({ id, code, name, x, y, width, height, columnCount: columnCount ?? 1, stackLevels: stackLevels ?? 1, depthCount: depthSlots?.length || 1, moduleLabel: moduleLabel ?? null, levelLabel: levelLabel ?? null }));
}

function uniqueCode(base: string, compartments: DraftCompartment[]) {
  const used = new Set(compartments.map((compartment) => compartment.code));
  const normalized = base.slice(0, 20);
  if (!used.has(normalized)) return normalized;
  let index = 2;
  let candidate = `${base}-${index}`.slice(0, 20);
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`.slice(0, 20);
  }
  return candidate;
}

export default function RackDesignerPage() {
  const params = useParams();
  const id = params.id as string;
  const [rack, setRack] = useState<RackData | null>(null);
  const [compartments, setCompartments] = useState<DraftCompartment[]>([]);
  const [savedCompartments, setSavedCompartments] = useState<DraftCompartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ compartmentId: string; columnIndex: number; stackIndex: number } | null>(null);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [undoStack, setUndoStack] = useState<DraftCompartment[][]>([]);
  const [redoStack, setRedoStack] = useState<DraftCompartment[][]>([]);
  const [quickLevels, setQuickLevels] = useState(3);
  const [quickColumns, setQuickColumns] = useState(1);
  const [quickStack, setQuickStack] = useState(1);
  const [quickDepths, setQuickDepths] = useState(1);
  const [quickCodePrefix, setQuickCodePrefix] = useState("N");
  const [quickNamePrefix, setQuickNamePrefix] = useState("Nivel");

  const load = useCallback(async () => {
    try {
      const [rackData, compData] = await Promise.all([
        apiFetch<RackResponse>(`/api/racks/${id}`),
        apiFetch<CompartmentsResponse>(`/api/racks/${id}/compartments`),
      ]);
      setRack(rackData.rack);
      setCompartments(compData.compartments);
      setSavedCompartments(compData.compartments);
      setUndoStack([]);
      setRedoStack([]);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el rack");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasChanges = JSON.stringify(geometry(compartments)) !== JSON.stringify(geometry(savedCompartments));
  const rackWidth = rack?.widthMm ?? 10000;
  const rackHeight = rack?.heightMm ?? 10000;
  const selected = compartments.find((compartment) => compartment.id === selectedComp);
  const hasProtectedUse = (compartment: DraftCompartment | undefined) => compartment ? compartmentHasProtectedUse(compartment as Parameters<typeof compartmentHasProtectedUse>[0]) : false;
  const hasAnyPositions = (compartment: DraftCompartment | undefined) => {
    if (!compartment) return false;
    if ((compartment.positions?.length ?? 0) > 0) return true;
    return (compartment.depthSlots as Array<{ positions?: unknown[] }> | undefined)?.some((slot) => (slot.positions?.length ?? 0) > 0) ?? false;
  };

  function applyDraft(next: DraftCompartment[], message?: string) {
    setUndoStack((history) => [...history, compartments]);
    setRedoStack([]);
    setCompartments(next);
    if (message) setToast(message);
  }

  function generateQuickCompartments() {
    const levels = Math.max(1, Math.min(20, quickLevels));
    const cols = Math.max(1, Math.min(100, quickColumns));
    const stack = Math.max(1, Math.min(100, quickStack));
    const depths = Math.max(1, Math.min(3, quickDepths));
    const totalCells = levels * cols * stack * depths;
    if (totalCells > 1000) { setToast("La matriz no puede superar 1000 posiciones físicas"); return; }
    const digits = Math.max(2, String(levels).length);
    const compartmentHeight = Math.floor(rackHeight / levels);
    const compartmentWidth = rackWidth;
    const newCompartments: DraftCompartment[] = [];
    const existing = [...compartments];
    for (let i = 0; i < levels; i++) {
      const num = String(i + 1).padStart(digits, "0");
      const code = uniqueCode(`${quickCodePrefix}${num}`, [...existing, ...newCompartments]);
      const name = `${quickNamePrefix} ${num}`;
      const rect = { x: 0, y: i * compartmentHeight, width: compartmentWidth, height: compartmentHeight };
      if (newCompartments.some(c => rectsOverlap(rect, c))) continue;
      const depthSlots = Array.from({ length: depths }, (_, d) => ({
        id: `draft-depth-${crypto.randomUUID()}`,
        code: `D${String(d + 1).padStart(2, "0")}`,
        name: ["Frente", "Centro", "Fondo"][d] ?? `Profundidad ${d + 1}`,
      }));
      newCompartments.push({ id: `new-${crypto.randomUUID()}`, code, name, ...rect, columnCount: cols, stackLevels: stack, depthSlots });
    }
    if (newCompartments.length === 0) { setToast("No se pudo generar ningún compartimento"); return; }
    const next = [...compartments.filter(c => !c.id.startsWith("new-")), ...newCompartments];
    applyDraft(next, `${newCompartments.length} compartimentos generados`);
  }

  function deleteCompartment(compartmentId: string) {
    const compartment = compartments.find((item) => item.id === compartmentId);
    if (hasProtectedUse(compartment)) { setToast("No se puede eliminar porque tiene stock o una sesión activa"); return; }
    applyDraft(compartments.filter((item) => item.id !== compartmentId), "Compartimento eliminado del borrador");
    setSelectedComp(null);
    setSelectedCell(null);
    setSelectedDepth(0);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [...history, compartments]);
    setUndoStack((history) => history.slice(0, -1));
    setCompartments(previous);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [...history, compartments]);
    setRedoStack((history) => history.slice(0, -1));
    setCompartments(next);
  }

  function updateMatrix(values: { columnCount?: number; stackLevels?: number; depthCount?: number }) {
    if (!selected) return;
    const columnCount = Math.min(Math.max(values.columnCount ?? selected.columnCount ?? 1, 1), 100);
    const stackLevels = Math.min(Math.max(values.stackLevels ?? selected.stackLevels ?? 1, 1), 100);
    const depthCount = Math.min(Math.max(values.depthCount ?? (selected.depthSlots?.length || 1), 1), 10);
    if (columnCount * stackLevels * depthCount > 1000) {
      setToast("La matriz no puede superar 1000 posiciones físicas");
      return;
    }
    if (hasProtectedUse(selected) && (columnCount < (selected.columnCount ?? 1) || stackLevels < (selected.stackLevels ?? 1) || depthCount < (selected.depthSlots?.length || 1))) {
      setToast("No se puede reducir una matriz con stock o una sesión activa");
      return;
    }
    const currentSlots = selected.depthSlots ?? [];
    const depthSlots = Array.from({ length: depthCount }, (_, index) => currentSlots[index] ?? {
      id: `draft-depth-${crypto.randomUUID()}`,
      code: `D${String(index + 1).padStart(2, "0")}`,
      name: ["Frente", "Centro", "Fondo"][index] ?? `Profundidad ${index + 1}`,
    });
    applyDraft(compartments.map((compartment) => compartment.id === selected.id ? { ...compartment, columnCount, stackLevels, depthSlots } : compartment), "Matriz actualizada");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "s") { event.preventDefault(); void saveDesign(); return; }
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (event.key === "Delete" && selectedComp) { event.preventDefault(); deleteCompartment(selectedComp); }
      if (event.key === "Escape") { setSelectedComp(null); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function deactivatePositions(compartmentId: string) {
    const compartment = compartments.find((item) => item.id === compartmentId);
    if (!compartment) return;
    const hasStock = hasProtectedUse(compartment);
    if (hasStock) {
      setToast("No se pueden desactivar posiciones con stock o una sesión activa");
      return;
    }
    const confirmed = window.confirm(
      "¿Desactivar todas las posiciones vacías de este compartimento?",
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await apiFetch(`/api/racks/${id}/deactivate-positions`, {
        method: "POST",
        body: JSON.stringify({ compartmentIds: [compartmentId] }),
      });
      await load();
      setToast("Posiciones desactivadas. Ya puedes editar el compartimento.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al desactivar posiciones");
    } finally {
      setSaving(false);
    }
  }

  async function saveDesign() {
    if (!hasChanges) { setToast("No hay cambios pendientes"); return; }
    if (!rack) return;
    setSaving(true);
    try {
      const response = await apiFetch<{ version: number; compartments: DraftCompartment[] }>(`/api/racks/${id}/design`, {
        method: "PUT",
        body: JSON.stringify({
          expectedVersion: rack.version,
          compartments: compartments.map(({ id: compartmentId, code, name, x, y, width, height, columnCount, stackLevels, depthSlots, moduleLabel, levelLabel }) => ({
            ...(compartmentId.startsWith("new-") ? {} : { id: compartmentId }),
            code, name, x, y, width, height, columnCount: columnCount ?? 1, stackLevels: stackLevels ?? 1, depthCount: depthSlots?.length || 1, moduleLabel: moduleLabel ?? null, levelLabel: levelLabel ?? null,
          })),
        }),
      });
      setCompartments(response.compartments);
      setSavedCompartments(response.compartments);
      setRack((current) => current ? { ...current, version: response.version } : current);
      setUndoStack([]); setRedoStack([]); setToast("Diseño guardado");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al guardar el diseño");
    } finally {
      setSaving(false);
    }
  }

  async function generatePositions() {
    if (hasChanges || compartments.length === 0) { setToast("Guarda el diseño antes de generar posiciones"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/positions", { method: "POST", body: JSON.stringify({ rackId: id, compartmentIds: compartments.map((compartment) => compartment.id), generatePositions: true }) });
      await load();
      setToast("Posiciones generadas");
    } catch (error) { setToast(error instanceof Error ? error.message : "Error al generar posiciones"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (loadError) return <div className="mx-auto max-w-xl py-16 text-center"><p className="font-medium text-red-600">No se pudo cargar el diseñador</p><p className="mt-2 text-sm text-slate-500">{loadError}</p><Button className="mt-4" onClick={() => { setLoading(true); void load(); }}>Reintentar</Button></div>;
  if (!rack) return <div className="py-16 text-center text-slate-500">Rack no encontrado.</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/locations/racks/${id}`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Diseñador: {rack.name}</h1>
          <p className="text-xs text-slate-400">Dimensiones: {rackWidth}×{rackHeight}mm · Versión {rack.version}</p>
        </div>
        {hasChanges && <span className="rounded bg-amber-50 px-3 py-1 text-sm text-amber-700">Cambios sin guardar</span>}
        {toast && <span className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-600">{toast}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-auto"><CardTitle className="text-base">Vista frontal</CardTitle><CardDescription>Selecciona un compartimento para ver y editar sus propiedades.</CardDescription></div>
                <Button size="icon" variant="outline" title="Deshacer" aria-label="Deshacer" disabled={undoStack.length === 0} onClick={undo}><Undo2 size={14} /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <InteractiveRackDesigner
                compartments={compartments}
                rackWidth={rackWidth}
                rackHeight={rackHeight}
                selectedId={selectedComp}
                selectedCell={selectedCell}
                selectedDepthIndex={selectedDepth}
                onSelect={(compartmentId) => { setSelectedComp(compartmentId); setSelectedCell(null); setSelectedDepth(0); }}
                onCellSelect={setSelectedCell}
              />
              {selected && (selected.depthSlots?.length ?? 0) > 1 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Vista lateral — profundidad</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.depthSlots!.map((slot, index) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedDepth(index)}
                        className={`rounded-md border p-2 text-center text-xs transition-all ${selectedDepth === index ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <span className="block font-medium text-slate-700">{slot.name}</span>
                        <span className="block text-slate-400">{slot.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-teal-200 bg-teal-50/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Configuración rápida</CardTitle><CardDescription>Genera compartimentos uniformes sin dibujar.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">Niveles<input className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs" type="number" min={1} max={20} value={quickLevels} onChange={(e) => setQuickLevels(Math.max(1, parseInt(e.target.value) || 1))} /></label>
                <label className="text-xs text-slate-500">Columnas<input className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs" type="number" min={1} max={100} value={quickColumns} onChange={(e) => setQuickColumns(Math.max(1, parseInt(e.target.value) || 1))} /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">Filas apilado<input className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs" type="number" min={1} max={100} value={quickStack} onChange={(e) => setQuickStack(Math.max(1, parseInt(e.target.value) || 1))} /></label>
                <label className="text-xs text-slate-500">Profundidades<input className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs" type="number" min={1} max={3} value={quickDepths} onChange={(e) => setQuickDepths(Math.max(1, parseInt(e.target.value) || 1))} /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-8 text-xs" placeholder="Prefijo código" value={quickCodePrefix} onChange={(e) => setQuickCodePrefix(e.target.value || "N")} />
                <Input className="h-8 text-xs" placeholder="Prefijo nombre" value={quickNamePrefix} onChange={(e) => setQuickNamePrefix(e.target.value || "Nivel")} />
              </div>
              <p className="text-xs text-teal-700">Total: {quickLevels * quickColumns * quickStack * quickDepths} posiciones físicas</p>
              <Button className="w-full" size="sm" variant="default" onClick={generateQuickCompartments}>
                <Layers size={14} /> Generar {quickLevels} compartimento{quickLevels !== 1 ? "s" : ""}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Herramientas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {selectedComp && <>
                <Button className="w-full" size="sm" variant="destructive" onClick={() => deleteCompartment(selectedComp)}><Trash2 size={14} /> Eliminar</Button>
              </>}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <Button className="w-full" size="sm" variant="outline" onClick={() => void generatePositions()} disabled={saving || hasChanges || compartments.length === 0}><Layers size={14} /> Generar posiciones</Button>
                <p className="mt-1 text-xs text-slate-400">Crea las ubicaciones físicas reales a partir de la matriz (columnas × niveles × profundidades). Cada celda genera un código tipo <code className="text-xs">R01-N01-C01-F01-P01</code> con su QR.</p>
              </div>
              <Button className="w-full" size="sm" onClick={() => void saveDesign()} disabled={saving || !hasChanges}>{saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} Guardar cambios</Button>
              {selected && <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <label className="text-xs text-slate-500">Código<input className="mt-0.5 h-7 w-full rounded border border-slate-200 bg-white px-1.5 text-xs" value={selected.code} onChange={(e) => { const v = e.target.value.trim(); if (!v) return; applyDraft(compartments.map(c => c.id === selected.id ? { ...c, code: v } : c)); }} /></label>
                  <label className="text-xs text-slate-500">Nombre<input className="mt-0.5 h-7 w-full rounded border border-slate-200 bg-white px-1.5 text-xs" value={selected.name} onChange={(e) => { const v = e.target.value.trim(); if (!v) return; applyDraft(compartments.map(c => c.id === selected.id ? { ...c, name: v } : c)); }} /></label>
                </div>
                <p className="text-xs text-slate-400">{selected.x},{selected.y} · {selected.width}×{selected.height}</p>
              </div>}
              {selected && <Card className="border-teal-100 bg-teal-50/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Matriz interna</CardTitle><CardDescription>Configura las ubicaciones físicas de este compartimiento.</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-500">Columnas<input className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" type="number" min={1} max={100} value={selected.columnCount ?? 1} onChange={(event) => updateMatrix({ columnCount: Number(event.target.value) })} /></label>
                    <label className="text-xs text-slate-500">Niveles<input className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" type="number" min={1} max={100} value={selected.stackLevels ?? 1} onChange={(event) => updateMatrix({ stackLevels: Number(event.target.value) })} /></label>
                  </div>
                  <div><p className="mb-1 text-xs text-slate-500">Cantidad de profundidades</p><div className="grid grid-cols-3 gap-1">{[1, 2, 3].map((count) => <Button key={count} size="sm" variant={(selected.depthSlots?.length || 1) === count ? "default" : "outline"} onClick={() => { updateMatrix({ depthCount: count }); setSelectedDepth(Math.min(selectedDepth, count - 1)); }}>{count}</Button>)}</div></div>
                  <div><p className="mb-1 text-xs text-slate-500">Profundidad activa</p><div className="grid grid-cols-3 gap-1">{(selected.depthSlots?.length ? selected.depthSlots : [{ id: "D01", code: "D01", name: "Frente" }]).map((slot, index) => <Button key={slot.id} size="sm" variant={selectedDepth === index ? "default" : "outline"} onClick={() => setSelectedDepth(index)}>{slot.name}</Button>)}</div></div>
                  <p className="text-xs font-medium text-teal-700">{(selected.columnCount ?? 1) * (selected.stackLevels ?? 1) * (selected.depthSlots?.length || 1)} posiciones físicas</p>
                  {hasAnyPositions(selected) && !hasProtectedUse(selected) && (
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => void deactivatePositions(selected.id)}>
                      <Trash2 size={14} /> Desactivar posiciones vacías
                    </Button>
                  )}
                  {hasProtectedUse(selected) && <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">Hay stock o una sesión activa. Transfiere el stock o finaliza la sesión para modificar esta matriz.</p>}
                  {selectedCell?.compartmentId === selected.id && <p className="text-xs text-slate-500">Celda seleccionada: columna {selectedCell.columnIndex}, nivel {selectedCell.stackIndex}, profundidad {selectedDepth + 1}</p>}
                </CardContent>
              </Card>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Compartimentos ({compartments.length})</CardTitle></CardHeader>
            <CardContent className="max-h-72 space-y-1 overflow-y-auto">
              {compartments.map((compartment) => <button key={compartment.id} onClick={() => { const next = selectedComp === compartment.id ? null : compartment.id; setSelectedComp(next); setSelectedCell(null); setSelectedDepth(0); }} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${selectedComp === compartment.id ? "bg-teal-50 ring-1 ring-teal-400" : "bg-slate-50 hover:bg-slate-100"}`}>
                <span className="font-medium text-slate-600">{compartment.code}</span><span className="truncate text-slate-400">{compartment.name}</span><span className="ml-auto text-slate-400">{compartment.x},{compartment.y} {compartment.width}×{compartment.height}</span>
              </button>)}
              {compartments.length === 0 && <p className="text-xs text-slate-400">Usa la configuración rápida para empezar.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
