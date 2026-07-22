"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { moveRect, rectsOverlap, splitHorizontal, splitVertical, type Compartment, type Rect } from "@/lib/rack-validation";
import { ArrowLeft, Copy, Grid3X3, Layers, LoaderCircle, MousePointer2, Pencil, Plus, Redo2, Save, SplitSquareHorizontal, SplitSquareVertical, Trash2, Undo2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveRackDesigner, type DesignerCompartment } from "@/components/locations/interactive-rack-designer";

type DraftCompartment = DesignerCompartment & { active?: boolean; positions?: { id: string }[] };
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

function firstFreeRect(compartments: DraftCompartment[], width: number, height: number, rackWidth: number, rackHeight: number): Rect | null {
  const step = Math.max(1, Math.min(width, height, 100));
  for (let y = 0; y + height <= rackHeight; y += step) {
    for (let x = 0; x + width <= rackWidth; x += step) {
      const candidate = { x, y, width, height };
      if (!compartments.some((compartment) => rectsOverlap(candidate, compartment))) return candidate;
    }
  }
  return null;
}

export default function RackDesignerPage() {
  const params = useParams();
  const id = params.id as string;
  const [rack, setRack] = useState<RackData | null>(null);
  const [compartments, setCompartments] = useState<DraftCompartment[]>([]);
  const [savedCompartments, setSavedCompartments] = useState<DraftCompartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ compartmentId: string; columnIndex: number; stackIndex: number } | null>(null);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [undoStack, setUndoStack] = useState<DraftCompartment[][]>([]);
  const [redoStack, setRedoStack] = useState<DraftCompartment[][]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newX, setNewX] = useState("0");
  const [newY, setNewY] = useState("0");
  const [newW, setNewW] = useState("1000");
  const [newH, setNewH] = useState("1000");

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
    } catch {
      setToast("No se pudo cargar el rack");
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
  const hasActivePositions = (compartment: DraftCompartment | undefined) => (compartment?.positions?.length ?? 0) > 0
    || compartment?.depthSlots?.some((slot) => ((slot as { positions?: { id: string }[] }).positions?.length ?? 0) > 0) === true;

  function applyDraft(next: DraftCompartment[], message?: string) {
    setUndoStack((history) => [...history, compartments]);
    setRedoStack([]);
    setCompartments(next);
    if (message) setToast(message);
  }

  function updateRect(compartmentId: string, rect: Rect) {
    applyDraft(compartments.map((compartment) => compartment.id === compartmentId ? { ...compartment, ...rect } : compartment));
  }

  function addCompartment(data?: { code?: string; name?: string; x?: number; y?: number; width?: number; height?: number }) {
    const code = (data?.code ?? newCode).trim();
    const name = (data?.name ?? newName).trim();
    const rect = {
      x: data?.x ?? Number(newX), y: data?.y ?? Number(newY),
      width: data?.width ?? Number(newW), height: data?.height ?? Number(newH),
    };
    if (!code || !name) { setToast("Código y nombre requeridos"); return; }
    if (!Number.isInteger(rect.x) || !Number.isInteger(rect.y) || !Number.isInteger(rect.width) || !Number.isInteger(rect.height)) { setToast("Las dimensiones deben ser enteros"); return; }
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > rackWidth || rect.y + rect.height > rackHeight) { setToast("El compartimento queda fuera del rack"); return; }
    if (compartments.some((compartment) => rectsOverlap(rect, compartment))) { setToast("El compartimento solapa con otro"); return; }
    const tempId = `new-${crypto.randomUUID()}`;
    applyDraft([...compartments, { id: tempId, code: uniqueCode(code, compartments), name, ...rect, columnCount: 1, stackLevels: 1, depthSlots: [] }], "Compartimento agregado al borrador");
    setSelectedComp(tempId);
    setNewCode(""); setNewName(""); setNewX("0"); setNewY("0"); setNewW("1000"); setNewH("1000");
    setShowAddForm(false);
    setDrawMode(false);
  }

  function deleteCompartment(compartmentId: string) {
    const compartment = compartments.find((item) => item.id === compartmentId);
    if (hasActivePositions(compartment)) { setToast("No se puede eliminar porque tiene posiciones activas"); return; }
    applyDraft(compartments.filter((item) => item.id !== compartmentId), "Compartimento eliminado del borrador");
    setSelectedComp(null);
    setSelectedCell(null);
    setSelectedDepth(0);
  }

  function splitCompartment(sourceId: string, direction: "horizontal" | "vertical") {
    const source = compartments.find((item) => item.id === sourceId);
    if (!source) return;
    if (hasActivePositions(source)) { setToast("No se puede dividir porque tiene posiciones activas"); return; }
    const parts = direction === "horizontal" ? splitHorizontal(source as Compartment) : splitVertical(source as Compartment);
    if (parts.some((part) => part.width < 2 || part.height < 2)) { setToast("El compartimento es demasiado pequeño para dividir"); return; }
    const nextParts = parts.map((part) => ({ ...part, id: `new-${crypto.randomUUID()}`, code: uniqueCode(part.code, compartments.filter((item) => item.id !== sourceId)), columnCount: source.columnCount ?? 1, stackLevels: source.stackLevels ?? 1, depthSlots: [] }));
    applyDraft([...compartments.filter((item) => item.id !== sourceId), ...nextParts], "División agregada al borrador");
    setSelectedComp(nextParts[0].id);
  }

  function duplicate(compartmentId: string) {
    const source = compartments.find((item) => item.id === compartmentId);
    if (!source) return;
    const rect = firstFreeRect(compartments, source.width, source.height, rackWidth, rackHeight);
    if (!rect) { setToast("No hay espacio libre para duplicar"); return; }
    const copyId = `new-${crypto.randomUUID()}`;
    const existingWithoutSource = compartments.filter((item) => item.id !== compartmentId);
    const next = { ...source, ...rect, id: copyId, code: uniqueCode(`${source.code}-COPIA`, existingWithoutSource), name: `${source.name} (copia)`, columnCount: source.columnCount ?? 1, stackLevels: source.stackLevels ?? 1, depthSlots: [] };
    applyDraft([...compartments, next], "Copia agregada al borrador");
    setSelectedComp(copyId);
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
    if (hasActivePositions(selected) && (columnCount < (selected.columnCount ?? 1) || stackLevels < (selected.stackLevels ?? 1) || depthCount < (selected.depthSlots?.length || 1))) {
      setToast("No se puede reducir una matriz con posiciones creadas");
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
      if (modifier && event.key.toLowerCase() === "d" && selectedComp) { event.preventDefault(); duplicate(selectedComp); return; }
      if (event.key === "Delete" && selectedComp) { event.preventDefault(); deleteCompartment(selectedComp); }
      if (selected && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 500 : 100;
        const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 }
          : event.key === "ArrowRight" ? { x: step, y: 0 }
          : event.key === "ArrowUp" ? { x: 0, y: -step }
          : { x: 0, y: step };
        updateRect(selected.id, moveRect(selected, delta, rackWidth, rackHeight, 100));
      }
      if (event.key === "Escape") { setDrawMode(false); setSelectedComp(null); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
              <div className="mr-auto"><CardTitle className="text-base">Vista frontal interactiva</CardTitle><CardDescription>Arrastra, redimensiona o dibuja compartimentos.</CardDescription></div>
              <Button size="sm" variant={drawMode ? "default" : "outline"} onClick={() => setDrawMode((value) => !value)}><Pencil size={14} /> Dibujar</Button>
              <Button size="icon" variant={showGrid ? "default" : "outline"} title="Mostrar grid" aria-label="Mostrar grid" onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={14} /></Button>
              <Button size="icon" variant={snapEnabled ? "default" : "outline"} title="Ajustar al grid" aria-label="Ajustar al grid" onClick={() => setSnapEnabled((value) => !value)}><MousePointer2 size={14} /></Button>
              <Button size="icon" variant="outline" title="Deshacer" aria-label="Deshacer" disabled={undoStack.length === 0} onClick={undo}><Undo2 size={14} /></Button>
              <Button size="icon" variant="outline" title="Rehacer" aria-label="Rehacer" disabled={redoStack.length === 0} onClick={redo}><Redo2 size={14} /></Button>
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
              drawMode={drawMode}
              snapEnabled={snapEnabled}
              showGrid={showGrid}
              onSelect={(compartmentId) => { setSelectedComp(compartmentId); setSelectedCell(null); setSelectedDepth(0); }}
              onCellSelect={setSelectedCell}
              onCommit={updateRect}
              onCreateFromRect={(rect) => { setNewX(String(rect.x)); setNewY(String(rect.y)); setNewW(String(rect.width)); setNewH(String(rect.height)); setShowAddForm(true); setDrawMode(false); }}
              onInvalid={setToast}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Herramientas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => setShowAddForm((value) => !value)}><Plus size={14} /> {showAddForm ? "Cancelar" : "Nuevo compartimento"}</Button>
              {selectedComp && <>
                <Button className="w-full" size="sm" variant="outline" onClick={() => splitCompartment(selectedComp, "horizontal")}><SplitSquareHorizontal size={14} /> Dividir H</Button>
                <Button className="w-full" size="sm" variant="outline" onClick={() => splitCompartment(selectedComp, "vertical")}><SplitSquareVertical size={14} /> Dividir V</Button>
                <Button className="w-full" size="sm" variant="outline" onClick={() => duplicate(selectedComp)}><Copy size={14} /> Duplicar</Button>
                <Button className="w-full" size="sm" variant="destructive" onClick={() => deleteCompartment(selectedComp)}><Trash2 size={14} /> Eliminar</Button>
              </>}
              <Button className="w-full" size="sm" variant="outline" onClick={() => void generatePositions()} disabled={saving || hasChanges || compartments.length === 0}><Layers size={14} /> Generar posiciones</Button>
              <Button className="w-full" size="sm" onClick={() => void saveDesign()} disabled={saving || !hasChanges}>{saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />} Guardar cambios</Button>
              {selected && <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">{selected.code} · {selected.x},{selected.y} · {selected.width}×{selected.height}</p>}
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
                  {selectedCell?.compartmentId === selected.id && <p className="text-xs text-slate-500">Celda seleccionada: columna {selectedCell.columnIndex}, nivel {selectedCell.stackIndex}, profundidad {selectedDepth + 1}</p>}
                </CardContent>
              </Card>}
            </CardContent>
          </Card>

          {showAddForm && <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Nuevo compartimento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Código (C01)" value={newCode} onChange={(event) => setNewCode(event.target.value)} />
              <Input placeholder="Nombre" value={newName} onChange={(event) => setNewName(event.target.value)} />
              <p className="text-xs text-slate-400">Coordenadas en mm, dentro de {rackWidth}×{rackHeight}.</p>
              <div className="grid grid-cols-2 gap-2">
                <Input aria-label="X" placeholder="X" type="number" value={newX} onChange={(event) => setNewX(event.target.value)} />
                <Input aria-label="Y" placeholder="Y" type="number" value={newY} onChange={(event) => setNewY(event.target.value)} />
                <Input aria-label="Ancho" placeholder="Ancho" type="number" value={newW} onChange={(event) => setNewW(event.target.value)} />
                <Input aria-label="Alto" placeholder="Alto" type="number" value={newH} onChange={(event) => setNewH(event.target.value)} />
              </div>
              <Button size="sm" className="w-full" onClick={() => addCompartment()}><Plus size={14} /> Agregar al borrador</Button>
            </CardContent>
          </Card>}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Compartimentos ({compartments.length})</CardTitle></CardHeader>
            <CardContent className="max-h-72 space-y-1 overflow-y-auto">
              {compartments.map((compartment) => <button key={compartment.id} onClick={() => { const next = selectedComp === compartment.id ? null : compartment.id; setSelectedComp(next); setSelectedCell(null); setSelectedDepth(0); }} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${selectedComp === compartment.id ? "bg-teal-50 ring-1 ring-teal-400" : "bg-slate-50 hover:bg-slate-100"}`}>
                <span className="font-medium text-slate-600">{compartment.code}</span><span className="truncate text-slate-400">{compartment.name}</span><span className="ml-auto text-slate-400">{compartment.x},{compartment.y} {compartment.width}×{compartment.height}</span>
              </button>)}
              {compartments.length === 0 && <p className="text-xs text-slate-400">Dibuja o agrega un compartimento para empezar.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
