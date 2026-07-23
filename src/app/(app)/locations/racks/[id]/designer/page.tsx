"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info, Layers, LoaderCircle, LockKeyhole, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { compartmentHasProtectedUse } from "@/lib/rack-validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InteractiveRackDesigner, type DesignerCompartment } from "@/components/locations/interactive-rack-designer";
import { RackDepthPreview } from "@/components/locations/rack-depth-preview";

type DraftCompartment = DesignerCompartment & {
  active?: boolean;
  positions?: { id: string; locationStocks?: { id: string }[]; sessionPositions?: { id: string }[] }[];
};
type RackData = { id: string; name: string; widthMm: number | null; heightMm: number | null; version: number };
type RackResponse = { rack: RackData };
type CompartmentsResponse = { compartments: DraftCompartment[] };

function geometry(compartments: DraftCompartment[]) {
  return compartments.map(({ id, code, name, x, y, width, height, columnCount, stackLevels, depthSlots, moduleLabel, levelLabel }) => ({
    id,
    code,
    name,
    x,
    y,
    width,
    height,
    columnCount: columnCount ?? 1,
    stackLevels: stackLevels ?? 1,
    depthCount: depthSlots?.length || 1,
    moduleLabel: moduleLabel ?? null,
    levelLabel: levelLabel ?? null,
  }));
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
  const [selectedCodeDraft, setSelectedCodeDraft] = useState("");
  const [selectedNameDraft, setSelectedNameDraft] = useState("");
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
      setSelectedComp(null);
      setSelectedCell(null);
      setSelectedDepth(0);
      setSelectedCodeDraft("");
      setSelectedNameDraft("");
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
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasChanges = JSON.stringify(geometry(compartments)) !== JSON.stringify(geometry(savedCompartments));
  const rackWidth = rack?.widthMm ?? 10000;
  const rackHeight = rack?.heightMm ?? 10000;
  const selected = compartments.find((compartment) => compartment.id === selectedComp) ?? null;
  const quickPositionCount = quickLevels * quickColumns * quickStack * quickDepths;
  const selectedPositionCount = selected ? (selected.columnCount ?? 1) * (selected.stackLevels ?? 1) * (selected.depthSlots?.length || 1) : 0;
  const hasProtectedUse = (compartment: DraftCompartment | undefined) => compartment ? compartmentHasProtectedUse(compartment as Parameters<typeof compartmentHasProtectedUse>[0]) : false;
  const hasAnyPositions = (compartment: DraftCompartment | undefined) => {
    if (!compartment) return false;
    if ((compartment.positions?.length ?? 0) > 0) return true;
    return (compartment.depthSlots as Array<{ positions?: unknown[] }> | undefined)?.some((slot) => (slot.positions?.length ?? 0) > 0) ?? false;
  };

  function syncSelectedDraft(next: DraftCompartment[]) {
    const nextSelected = next.find((compartment) => compartment.id === selectedComp);
    if (!nextSelected) {
      setSelectedComp(null);
      setSelectedCodeDraft("");
      setSelectedNameDraft("");
      return;
    }
    setSelectedCodeDraft(nextSelected.code);
    setSelectedNameDraft(nextSelected.name);
  }

  function selectCompartment(compartmentId: string | null) {
    const nextSelected = compartmentId ? compartments.find((compartment) => compartment.id === compartmentId) : undefined;
    setSelectedComp(compartmentId);
    setSelectedCell(null);
    setSelectedDepth(0);
    setSelectedCodeDraft(nextSelected?.code ?? "");
    setSelectedNameDraft(nextSelected?.name ?? "");
  }

  function applyDraft(next: DraftCompartment[], message?: string) {
    setUndoStack((history) => [...history, compartments]);
    setRedoStack([]);
    setCompartments(next);
    syncSelectedDraft(next);
    if (message) setToast(message);
  }

  function generateQuickCompartments() {
    const levels = Math.max(1, Math.min(20, quickLevels));
    const cols = Math.max(1, Math.min(100, quickColumns));
    const stack = Math.max(1, Math.min(100, quickStack));
    const depths = Math.max(1, Math.min(3, quickDepths));
    const totalCells = levels * cols * stack * depths;
    if (totalCells > 1000) {
      setToast("La matriz no puede superar 1000 posiciones físicas");
      return;
    }
    if (compartments.some(hasProtectedUse)) {
      setToast("No se puede reemplazar la configuración: hay stock o sesiones activas");
      return;
    }
    if (compartments.length > 0 && !window.confirm("Esta acción reemplazará la organización actual del borrador. ¿Continuar?")) return;

    const digits = Math.max(2, String(levels).length);
    const compartmentHeight = Math.floor(rackHeight / levels);
    const newCompartments: DraftCompartment[] = [];
    const existing = [...compartments];
    for (let index = 0; index < levels; index += 1) {
      const number = String(index + 1).padStart(digits, "0");
      const depthSlots = Array.from({ length: depths }, (_, depthIndex) => ({
        id: `draft-depth-${crypto.randomUUID()}`,
        code: `P${String(depthIndex + 1).padStart(2, "0")}`,
        name: ["Frente", "Centro", "Fondo"][depthIndex] ?? `Profundidad ${depthIndex + 1}`,
      }));
      newCompartments.push({
        id: `new-${crypto.randomUUID()}`,
        code: uniqueCode(`${quickCodePrefix}${number}`, [...existing, ...newCompartments]),
        name: `${quickNamePrefix} ${number}`,
        x: 0,
        y: index * compartmentHeight,
        width: rackWidth,
        height: index === levels - 1 ? rackHeight - index * compartmentHeight : compartmentHeight,
        columnCount: cols,
        stackLevels: stack,
        depthSlots,
      });
    }

    applyDraft(newCompartments, `${newCompartments.length} compartimentos preparados`);
    const firstCompartment = newCompartments[0];
    setSelectedComp(firstCompartment?.id ?? null);
    setSelectedCell(null);
    setSelectedDepth(0);
    setSelectedCodeDraft(firstCompartment?.code ?? "");
    setSelectedNameDraft(firstCompartment?.name ?? "");
  }

  function deleteCompartment(compartmentId: string) {
    const compartment = compartments.find((item) => item.id === compartmentId);
    if (hasProtectedUse(compartment)) {
      setToast("No se puede eliminar porque tiene stock o una sesión activa");
      return;
    }
    applyDraft(compartments.filter((item) => item.id !== compartmentId), "Compartimento eliminado del borrador");
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [...history, compartments]);
    setUndoStack((history) => history.slice(0, -1));
    setCompartments(previous);
    syncSelectedDraft(previous);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [...history, compartments]);
    setRedoStack((history) => history.slice(0, -1));
    setCompartments(next);
    syncSelectedDraft(next);
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
      code: `P${String(index + 1).padStart(2, "0")}`,
      name: ["Frente", "Centro", "Fondo"][index] ?? `Profundidad ${index + 1}`,
    });
    applyDraft(compartments.map((compartment) => compartment.id === selected.id ? { ...compartment, columnCount, stackLevels, depthSlots } : compartment), "Matriz actualizada");
    setSelectedDepth(Math.min(selectedDepth, depthCount - 1));
  }

  function commitSelectedField(field: "code" | "name", value: string) {
    if (!selected) return;
    const nextValue = value.trim();
    if (!nextValue) {
      setToast(field === "code" ? "El código no puede quedar vacío" : "El nombre no puede quedar vacío");
      setSelectedCodeDraft(selected.code);
      setSelectedNameDraft(selected.name);
      return;
    }
    if (field === "code" && compartments.some((compartment) => compartment.id !== selected.id && compartment.code === nextValue)) {
      setToast("Ese código ya está usado en el rack");
      setSelectedCodeDraft(selected.code);
      return;
    }
    if (selected[field] === nextValue) return;
    applyDraft(compartments.map((compartment) => compartment.id === selected.id ? { ...compartment, [field]: nextValue } : compartment), "Cambio preparado");
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
      if (event.key === "Escape") selectCompartment(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function deactivatePositions(compartmentId: string) {
    const compartment = compartments.find((item) => item.id === compartmentId);
    if (!compartment) return;
    if (hasProtectedUse(compartment)) {
      setToast("No se pueden desactivar posiciones con stock o una sesión activa");
      return;
    }
    if (!window.confirm("¿Desactivar todas las posiciones vacías de este compartimento?")) return;
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
    if (!hasChanges) {
      setToast("No hay cambios pendientes");
      return;
    }
    if (!rack) return;
    setSaving(true);
    try {
      const response = await apiFetch<{ version: number; compartments: DraftCompartment[] }>(`/api/racks/${id}/design`, {
        method: "PUT",
        body: JSON.stringify({
          expectedVersion: rack.version,
          compartments: compartments.map(({ id: compartmentId, code, name, x, y, width, height, columnCount, stackLevels, depthSlots, moduleLabel, levelLabel }) => ({
            ...(compartmentId.startsWith("new-") ? {} : { id: compartmentId }),
            code,
            name,
            x,
            y,
            width,
            height,
            columnCount: columnCount ?? 1,
            stackLevels: stackLevels ?? 1,
            depthCount: depthSlots?.length || 1,
            moduleLabel: moduleLabel ?? null,
            levelLabel: levelLabel ?? null,
          })),
        }),
      });
      const nextSelected = selected ? response.compartments.find((compartment) => compartment.code === selected.code) : undefined;
      setCompartments(response.compartments);
      setSavedCompartments(response.compartments);
      setRack((current) => current ? { ...current, version: response.version } : current);
      setSelectedComp(nextSelected?.id ?? null);
      setSelectedCell(null);
      setSelectedCodeDraft(nextSelected?.code ?? "");
      setSelectedNameDraft(nextSelected?.name ?? "");
      setUndoStack([]);
      setRedoStack([]);
      setToast("Diseño guardado correctamente");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al guardar el diseño");
    } finally {
      setSaving(false);
    }
  }

  async function generatePositions() {
    if (hasChanges) {
      setToast("Guarda el diseño antes de crear posiciones");
      return;
    }
    if (compartments.length === 0) {
      setToast("Primero genera al menos un compartimento");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/positions", { method: "POST", body: JSON.stringify({ rackId: id, compartmentIds: compartments.map((compartment) => compartment.id), generatePositions: true }) });
      await load();
      setToast("Posiciones físicas creadas");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al generar posiciones");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500" role="status" aria-live="polite"><LoaderCircle className="mr-2 animate-spin" size={20} aria-hidden="true" /> Cargando diseñador...</div>;
  if (loadError) return <div className="mx-auto max-w-xl py-16 text-center" role="alert"><p className="font-medium text-red-600">No se pudo cargar el diseñador</p><p className="mt-2 text-sm text-slate-500">{loadError}</p><Button className="mt-4" type="button" onClick={() => { setLoading(true); void load(); }}>Reintentar</Button></div>;
  if (!rack) return <div className="py-16 text-center text-slate-500">Rack no encontrado.</div>;

  return (
    <main className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Link href={`/locations/racks/${id}`} aria-label={`Volver al rack ${rack.name}`} className="mt-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">Diseñar {rack.name}</h1>
              <Badge className={hasChanges ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"}>
                {saving ? "Guardando..." : hasChanges ? "Borrador sin guardar" : "Guardado"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">Configura la estructura, revisa la vista y crea las posiciones físicas.</p>
            <p className="mt-1 text-xs text-slate-400">Dimensiones del rack: {rackWidth} × {rackHeight} mm · Versión {rack.version}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={undo} disabled={undoStack.length === 0} aria-label="Deshacer último cambio">
            <Undo2 aria-hidden="true" /> Deshacer
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={redo} disabled={redoStack.length === 0} aria-label="Rehacer último cambio">
            <Redo2 aria-hidden="true" /> Rehacer
          </Button>
          <Button type="button" size="sm" onClick={() => void saveDesign()} disabled={saving || !hasChanges}>
            {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Guardar diseño
          </Button>
        </div>
      </header>

      <nav className="grid gap-2 sm:grid-cols-3" aria-label="Pasos del diseñador">
        {[
          ["1", "Configurar", "Define niveles y matriz"],
          ["2", "Revisar", "Selecciona y ajusta"],
          ["3", "Crear posiciones", "Genera los códigos físicos"],
        ].map(([number, title, description]) => (
          <div key={number} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600" aria-hidden="true">{number}</span>
            <div className="min-w-0"><p className="text-xs font-semibold text-slate-700">{title}</p><p className="truncate text-[11px] text-slate-400">{description}</p></div>
          </div>
        ))}
      </nav>

      {toast && <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white shadow-sm" role="status" aria-live="polite"><CheckCircle2 className="size-4 shrink-0 text-emerald-300" aria-hidden="true" /><span>{toast}</span></div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0" aria-labelledby="preview-title">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="preview-title" className="text-base font-semibold text-slate-900">Vista previa del rack</h2>
                  <p className="mt-1 text-sm text-slate-500">La vista es representativa. Haz clic o usa Tab para seleccionar un compartimento.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2 py-1 font-medium">{compartments.length} compartimentos</span><span className="rounded-full bg-teal-50 px-2 py-1 font-medium text-teal-700">{compartments.reduce((total, compartment) => total + (compartment.columnCount ?? 1) * (compartment.stackLevels ?? 1) * (compartment.depthSlots?.length || 1), 0)} posiciones</span></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="front-preview-title">
                  <div className="mb-2"><h3 id="front-preview-title" className="text-sm font-semibold text-slate-800">Vista frontal</h3><p className="text-xs text-slate-500">Niveles, columnas y celdas.</p></div>
                  <InteractiveRackDesigner
                    compartments={compartments}
                    rackWidth={rackWidth}
                    rackHeight={rackHeight}
                    selectedId={selectedComp}
                    selectedCell={selectedCell}
                    onSelect={selectCompartment}
                    onCellSelect={setSelectedCell}
                  />
                </section>
                <RackDepthPreview selected={selected} selectedDepth={selectedDepth} onSelectDepth={setSelectedDepth} />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500" role="note"><Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" /><p>La creación y organización se realiza desde <strong className="font-semibold text-slate-700">Configuración rápida</strong>. La vista frontal y lateral sirven para verificar el resultado.</p></div>
            </CardContent>
          </Card>
        </section>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start" aria-label="Configuración del diseñador">
          <Card id="quick-config" className="border-teal-200 bg-teal-50/30">
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white" aria-hidden="true">1</span><div><h2 className="text-base font-semibold text-slate-900">Configurar rack</h2><CardDescription className="mt-1">Genera niveles uniformes sin dibujar.</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="quick-levels">Niveles horizontales</Label><Input id="quick-levels" type="number" min={1} max={20} value={quickLevels} onChange={(event) => setQuickLevels(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} aria-describedby="quick-config-help" /></div>
                <div className="space-y-1.5"><Label htmlFor="quick-columns">Columnas por nivel</Label><Input id="quick-columns" type="number" min={1} max={100} value={quickColumns} onChange={(event) => setQuickColumns(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} aria-describedby="quick-config-help" /></div>
                <div className="space-y-1.5"><Label htmlFor="quick-stack">Filas apiladas</Label><Input id="quick-stack" type="number" min={1} max={100} value={quickStack} onChange={(event) => setQuickStack(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} aria-describedby="quick-config-help" /></div>
                <div className="space-y-1.5"><Label htmlFor="quick-depths">Profundidades</Label><Input id="quick-depths" type="number" min={1} max={3} value={quickDepths} onChange={(event) => setQuickDepths(Math.max(1, Math.min(3, Number(event.target.value) || 1)))} aria-describedby="quick-config-help" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-teal-200/70 pt-4">
                <div className="space-y-1.5"><Label htmlFor="quick-code-prefix">Prefijo de código</Label><Input id="quick-code-prefix" value={quickCodePrefix} maxLength={10} onChange={(event) => setQuickCodePrefix(event.target.value || "N")} /></div>
                <div className="space-y-1.5"><Label htmlFor="quick-name-prefix">Prefijo de nombre</Label><Input id="quick-name-prefix" value={quickNamePrefix} maxLength={40} onChange={(event) => setQuickNamePrefix(event.target.value || "Nivel")} /></div>
              </div>
              <dl className="grid grid-cols-2 gap-2 rounded-lg border border-teal-200 bg-white p-3 text-xs">
                <div><dt className="text-slate-500">Compartimentos</dt><dd className="mt-0.5 text-lg font-semibold text-slate-800">{quickLevels}</dd></div>
                <div><dt className="text-slate-500">Posiciones físicas</dt><dd className="mt-0.5 text-lg font-semibold text-teal-700">{quickPositionCount}</dd></div>
              </dl>
              <div id="quick-config-help" className="flex items-start gap-2 text-xs text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden="true" /><p>Al aplicar, se reemplaza la organización actual del borrador. Si te equivocas puedes usar <strong className="font-semibold text-slate-700">Deshacer</strong>.</p></div>
              <Button type="button" className="w-full" size="lg" onClick={generateQuickCompartments}><Layers aria-hidden="true" /> Aplicar configuración</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white" aria-hidden="true">2</span><div><h2 className="text-base font-semibold text-slate-900">Revisar compartimentos</h2><CardDescription className="mt-1">Selecciona uno para ajustar nombres y matriz.</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compartimentos generados</p><span className="text-xs text-slate-400">{compartments.length} total</span></div>
                {compartments.length > 0 ? <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1" aria-label="Lista de compartimentos">
                  {compartments.map((compartment) => {
                    const isSelected = selectedComp === compartment.id;
                    return <button key={compartment.id} type="button" aria-current={isSelected ? "true" : undefined} aria-label={`Seleccionar ${compartment.code}, ${compartment.name}`} onClick={() => selectCompartment(isSelected ? null : compartment.id)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40 ${isSelected ? "bg-teal-50 ring-1 ring-teal-400" : "hover:bg-slate-50"}`}>
                      <span className="min-w-12 font-semibold text-slate-700">{compartment.code}</span><span className="min-w-0 flex-1 truncate text-xs text-slate-500">{compartment.name}</span><span className="shrink-0 text-[10px] text-slate-400">{compartment.columnCount ?? 1}×{compartment.stackLevels ?? 1}×{compartment.depthSlots?.length || 1}</span>
                    </button>;
                  })}
                </div> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">Aplica una configuración rápida para crear los primeros compartimentos.</div>}
              </div>

              {selected ? <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compartimento seleccionado</p><p className="mt-1 text-sm font-semibold text-slate-800">{selected.code} · {selected.name}</p></div><Badge variant="outline">Editar</Badge></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="selected-code">Código</Label><Input id="selected-code" value={selectedCodeDraft} onChange={(event) => setSelectedCodeDraft(event.target.value)} onBlur={() => commitSelectedField("code", selectedCodeDraft)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} maxLength={20} /></div>
                  <div className="space-y-1.5"><Label htmlFor="selected-name">Nombre</Label><Input id="selected-name" value={selectedNameDraft} onChange={(event) => setSelectedNameDraft(event.target.value)} onBlur={() => commitSelectedField("name", selectedNameDraft)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} maxLength={120} /></div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><dt className="text-slate-400">Ubicación</dt><dd className="mt-0.5 font-medium text-slate-700">{selected.x}, {selected.y}</dd></div><div><dt className="text-slate-400">Tamaño</dt><dd className="mt-0.5 font-medium text-slate-700">{selected.width} × {selected.height} mm</dd></div></dl>

                <fieldset className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                  <legend className="px-1 text-sm font-semibold text-slate-800">Matriz de ubicaciones</legend>
                  <p className="text-xs text-slate-500">Cada combinación de columna, fila y profundidad crea una posición física.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="selected-columns">Columnas</Label><Input id="selected-columns" type="number" min={1} max={100} value={selected.columnCount ?? 1} onChange={(event) => updateMatrix({ columnCount: Number(event.target.value) })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="selected-stack">Filas apiladas</Label><Input id="selected-stack" type="number" min={1} max={100} value={selected.stackLevels ?? 1} onChange={(event) => updateMatrix({ stackLevels: Number(event.target.value) })} /></div>
                  </div>
                  <fieldset><legend className="mb-2 text-xs font-medium text-slate-600">Cantidad de profundidades</legend><div className="grid grid-cols-3 gap-2" role="group" aria-label="Cantidad de profundidades">{[1, 2, 3].map((count) => <Button key={count} type="button" size="sm" variant={(selected.depthSlots?.length || 1) === count ? "default" : "outline"} aria-pressed={(selected.depthSlots?.length || 1) === count} onClick={() => { updateMatrix({ depthCount: count }); setSelectedDepth(Math.min(selectedDepth, count - 1)); }}>{count}</Button>)}</div></fieldset>
                  <p className="text-xs font-semibold text-teal-800">{selectedPositionCount} posiciones físicas en este compartimento</p>
                  {selectedCell?.compartmentId === selected.id && <p className="rounded-md bg-white px-2.5 py-2 text-xs text-slate-600">Celda: columna {selectedCell.columnIndex}, fila {selectedCell.stackIndex}. Profundidad activa: {selectedDepth + 1}.</p>}
                </fieldset>

                {hasProtectedUse(selected) && <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800" role="alert"><LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Este compartimento tiene stock o una sesión activa. No puedes reducir su matriz ni eliminarlo.</p></div>}
                <div className="flex flex-wrap gap-2">
                  {hasAnyPositions(selected) && !hasProtectedUse(selected) && <Button type="button" size="sm" variant="outline" onClick={() => void deactivatePositions(selected.id)} disabled={saving}><Trash2 aria-hidden="true" /> Desactivar posiciones vacías</Button>}
                  <Button type="button" size="sm" variant="destructive" onClick={() => deleteCompartment(selected.id)} disabled={hasProtectedUse(selected)}><Trash2 aria-hidden="true" /> Eliminar compartimento</Button>
                </div>
              </div> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">Selecciona un compartimento de la lista o de la vista frontal.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white" aria-hidden="true">3</span><div><h2 className="text-base font-semibold text-slate-900">Crear posiciones físicas</h2><CardDescription className="mt-1">Convierte la matriz en ubicaciones con código y QR.</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">{hasChanges ? "Hay cambios pendientes. Guarda el diseño para habilitar la creación de posiciones." : compartments.length === 0 ? "Aún no hay compartimentos configurados." : "El diseño está guardado y listo para crear las posiciones."}</div>
              <Button type="button" className="w-full" variant="outline" onClick={() => void generatePositions()} disabled={saving || hasChanges || compartments.length === 0}><Layers aria-hidden="true" /> Crear posiciones físicas</Button>
              <p className="text-[11px] leading-relaxed text-slate-400">Se crea una ubicación por cada combinación de columnas, filas apiladas y profundidades.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
