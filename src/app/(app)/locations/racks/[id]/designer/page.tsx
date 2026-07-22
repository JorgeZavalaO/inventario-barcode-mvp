"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, Save, Plus, SplitSquareHorizontal, SplitSquareVertical, LoaderCircle, Copy, Trash2, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RackFrontView } from "@/components/locations/rack-front-view";

export default function RackDesignerPage() {
  const params = useParams();
  const id = params.id as string;

  const [rack, setRack] = useState<any>(null);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newX, setNewX] = useState("0");
  const [newY, setNewY] = useState("0");
  const [newW, setNewW] = useState("1000");
  const [newH, setNewH] = useState("1000");

  const load = useCallback(async () => {
    try {
      const [rackData, compData] = await Promise.all([
        apiFetch<any>(`/api/racks/${id}`),
        apiFetch<any>(`/api/racks/${id}/compartments`),
      ]);
      setRack(rackData.rack);
      setCompartments(compData.compartments);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);

  async function addCompartment(data?: {
    code?: string; name?: string; x?: number; y?: number; width?: number; height?: number;
  }) {
    const c = data ?? { code: newCode, name: newName, x: parseInt(newX), y: parseInt(newY), width: parseInt(newW), height: parseInt(newH) };
    if (!c.code || !c.name) { setToast("Código y nombre requeridos"); return; }
    try {
      await apiFetch(`/api/racks/${id}/compartments`, {
        method: "POST",
        body: JSON.stringify({ ...c, orderIndex: compartments.length }),
      });
      setNewCode(""); setNewName(""); setNewX("0"); setNewY("0"); setNewW("1000"); setNewH("1000");
      setShowAddForm(false);
      await load();
      setToast("Compartimento agregado");
    } catch { setToast("Error al crear"); }
  }

  async function deleteCompartment(compId: string) {
    try {
      await apiFetch(`/api/racks/${id}/compartments?compartmentId=${compId}`, { method: "DELETE" });
      setSelectedComp(null);
      await load();
      setToast("Compartimento desactivado");
    } catch { setToast("Error"); }
  }

  function splitHorizontal(sourceId: string) {
    const comp = compartments.find((c) => c.id === sourceId);
    if (!comp) return;
    const halfH = Math.floor(comp.height / 2);
    if (halfH < 2) { setToast("Muy pequeño para dividir"); return; }

    const code1 = `${comp.code}A`;
    const code2 = `${comp.code}B`;

    // Deactivate original
    void deleteCompartment(sourceId).then(() => {
      void addCompartment({ code: code1, name: `${comp.name} A`, x: comp.x, y: comp.y, width: comp.width, height: halfH });
      void addCompartment({ code: code2, name: `${comp.name} B`, x: comp.x, y: comp.y + halfH, width: comp.width, height: comp.height - halfH });
    });
  }

  function splitVertical(sourceId: string) {
    const comp = compartments.find((c) => c.id === sourceId);
    if (!comp) return;
    const halfW = Math.floor(comp.width / 2);
    if (halfW < 2) { setToast("Muy pequeño para dividir"); return; }

    const code1 = `${comp.code}L`;
    const code2 = `${comp.code}R`;

    void deleteCompartment(sourceId).then(() => {
      void addCompartment({ code: code1, name: `${comp.name} Izq`, x: comp.x, y: comp.y, width: halfW, height: comp.height });
      void addCompartment({ code: code2, name: `${comp.name} Der`, x: comp.x + halfW, y: comp.y, width: comp.width - halfW, height: comp.height });
    });
  }

  function duplicate(compId: string) {
    const comp = compartments.find((c) => c.id === compId);
    if (!comp) return;
    const offset = 50;
    void addCompartment({
      code: `${comp.code}-DUP`,
      name: `${comp.name} (copia)`,
      x: Math.min(comp.x + offset, 10000 - comp.width),
      y: Math.min(comp.y + offset, 10000 - comp.height),
      width: comp.width,
      height: comp.height,
    });
  }

  async function generatePositions() {
    if (compartments.length === 0) return;
    setSaving(true);
    try {
      await apiFetch("/api/positions", {
        method: "POST",
        body: JSON.stringify({ rackId: id, compartmentIds: compartments.map((c: any) => c.id), generatePositions: true }),
      });
      await load();
      setToast("Posiciones generadas");
    } catch { setToast("Error al generar posiciones"); }
    finally { setSaving(false); }
  }

  async function saveDesign() {
    setSaving(true);
    try {
      await apiFetch(`/api/racks/${id}/design`, {
        method: "PUT",
        body: JSON.stringify({ design: { compartments: compartments.map((c: any) => ({ id: c.id, x: c.x, y: c.y, w: c.width, h: c.height, code: c.code })) } }),
      });
      setToast("Diseño guardado");
    } catch { setToast("Error al guardar"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!rack) return <div className="py-16 text-center text-slate-500">Rack no encontrado.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/locations/racks/${id}`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Diseñador: {rack.name}</h1>
          <p className="text-xs text-slate-400">
            Dimensiones: {rack.widthMm ?? "—"}×{rack.heightMm ?? "—"}mm · Versión {rack.version}
            {rack.widthMm && <span className="ml-2 text-amber-600">Máx X: {rack.widthMm}, Máx Y: {rack.heightMm}</span>}
          </p>
        </div>
        {toast && <span className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-600">{toast}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Vista frontal</CardTitle></CardHeader>
            <CardContent className="min-h-[300px]">
              {compartments.length > 0 ? (
                <RackFrontView compartments={compartments} widthMm={rack.widthMm} heightMm={rack.heightMm} />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                  <Layers size={32} className="mr-2 text-slate-200" /> Sin compartimentos
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Herramientas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={14} /> {showAddForm ? "Cancelar" : "Nuevo compartimento"}
              </Button>
              {selectedComp && (
                <>
                  <Button className="w-full" size="sm" variant="outline" onClick={() => splitHorizontal(selectedComp)}>
                    <SplitSquareHorizontal size={14} /> Dividir H
                  </Button>
                  <Button className="w-full" size="sm" variant="outline" onClick={() => splitVertical(selectedComp)}>
                    <SplitSquareVertical size={14} /> Dividir V
                  </Button>
                  <Button className="w-full" size="sm" variant="outline" onClick={() => duplicate(selectedComp)}>
                    <Copy size={14} /> Duplicar
                  </Button>
                  <Button className="w-full" size="sm" variant="destructive" onClick={() => void deleteCompartment(selectedComp)}>
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </>
              )}
              <Button className="w-full" size="sm" variant="outline" onClick={() => void generatePositions()} disabled={saving || compartments.length === 0}>
                {saving ? <LoaderCircle className="animate-spin" size={14} /> : <Layers size={14} />} Generar posiciones
              </Button>
              <Button className="w-full" size="sm" variant="outline" onClick={() => void saveDesign()} disabled={saving}>
                <Save size={14} /> Guardar diseño
              </Button>
              {!selectedComp && compartments.length > 0 && (
                <p className="text-xs text-slate-400">Selecciona un compartimento en la lista para dividir, duplicar o eliminar.</p>
              )}
            </CardContent>
          </Card>

          {showAddForm && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Nuevo compartimento</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Código (C01)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
                <Input placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <p className="text-xs text-slate-400">Coordenadas normalizadas 0–{rack.widthMm ?? 10000}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="X" type="number" value={newX} onChange={(e) => setNewX(e.target.value)} />
                  <Input placeholder="Y" type="number" value={newY} onChange={(e) => setNewY(e.target.value)} />
                  <Input placeholder="Ancho" type="number" value={newW} onChange={(e) => setNewW(e.target.value)} />
                  <Input placeholder="Alto" type="number" value={newH} onChange={(e) => setNewH(e.target.value)} />
                </div>
                <Button size="sm" className="w-full" onClick={() => void addCompartment()}><Plus size={14} /> Agregar</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Compartimentos ({compartments.length})</CardTitle></CardHeader>
            <CardContent className="max-h-64 space-y-1 overflow-y-auto">
              {compartments.map((comp: any) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedComp(selectedComp === comp.id ? null : comp.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left ${
                    selectedComp === comp.id ? "bg-teal-50 ring-1 ring-teal-400" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-medium text-slate-600">{comp.code}</span>
                  <span className="text-slate-400 truncate">{comp.name}</span>
                  <span className="ml-auto text-slate-400">{comp.x},{comp.y} {comp.width}×{comp.height}</span>
                </button>
              ))}
              {compartments.length === 0 && <p className="text-xs text-slate-400">Agrega compartimentos para empezar.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
