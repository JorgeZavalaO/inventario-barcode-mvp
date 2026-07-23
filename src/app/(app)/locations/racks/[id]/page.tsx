"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Grid3X3, LoaderCircle, Paintbrush, Ruler } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RackFrontView } from "@/components/locations/rack-front-view";
import { RackSideView } from "@/components/locations/rack-side-view";

type StoragePosition = { id: string; code: string; columnIndex: number; stackIndex: number };
type DepthSlot = { id: string; code: string; name: string; positions?: StoragePosition[] };
type RackCompartment = {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnCount?: number;
  stackLevels?: number;
  depthSlots?: DepthSlot[];
};
type RackData = {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  widthMm: number | null;
  heightMm: number | null;
  zone: { floorId: string; name: string; floor: { name: string; warehouse: { name: string } } };
  compartments: RackCompartment[];
};

export default function RackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [rack, setRack] = useState<RackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ rack: RackData }>(`/api/racks/${id}`);
      setRack(data.rack);
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

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500" role="status" aria-live="polite"><LoaderCircle className="mr-2 animate-spin" size={20} aria-hidden="true" /> Cargando rack...</div>;
  if (loadError) return <div className="mx-auto max-w-xl py-16 text-center" role="alert"><p className="font-medium text-red-600">No se pudo cargar el rack</p><p className="mt-2 text-sm text-slate-500">{loadError}</p><Button type="button" className="mt-4" onClick={() => { setLoading(true); void load(); }}>Reintentar</Button></div>;
  if (!rack) return <div className="py-16 text-center text-slate-500">Rack no encontrado.</div>;

  const compartments = rack.compartments ?? [];
  const slots = compartments.flatMap((compartment) => compartment.depthSlots ?? []);
  const positions = slots.flatMap((slot) => slot.positions ?? []);
  const path = rack.zone?.floor?.warehouse?.name ? `${rack.zone.floor.warehouse.name} / ${rack.zone.floor.name} / ${rack.zone.name}` : "";
  const matrixPositions = compartments.reduce((total, compartment) => total + (compartment.columnCount ?? 1) * (compartment.stackLevels ?? 1) * (compartment.depthSlots?.length || 1), 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Link href={rack.zoneId ? `/locations/floors/${rack.zone.floorId}` : "/locations"} aria-label="Volver a la ubicación anterior" className="mt-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40"><ArrowLeft size={20} aria-hidden="true" /></Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{rack.name}</h1><Badge variant="outline">{rack.code}</Badge></div>
            {path && <p className="mt-1 text-sm text-slate-500">{path}</p>}
            <p className="mt-1 text-xs text-slate-400">Vista general del rack antes de editar su diseño.</p>
          </div>
        </div>
        <Link href={`/locations/racks/${id}/designer`} className="shrink-0"><Button type="button"><Paintbrush aria-hidden="true" /> Abrir diseñador</Button></Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen del rack">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Compartimentos</p><p className="mt-1 text-2xl font-semibold text-slate-900">{compartments.length}</p><p className="mt-1 text-xs text-slate-400">Niveles configurados</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Posiciones activas</p><p className="mt-1 text-2xl font-semibold text-teal-700">{positions.length}</p><p className="mt-1 text-xs text-slate-400">Ubicaciones listas para conteo</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Slots de profundidad</p><p className="mt-1 text-2xl font-semibold text-slate-900">{slots.length}</p><p className="mt-1 text-xs text-slate-400">Frente, centro o fondo</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Dimensiones</p><p className="mt-1 text-2xl font-semibold text-slate-900">{rack.widthMm ?? "—"} × {rack.heightMm ?? "—"}</p><p className="mt-1 text-xs text-slate-400">Milímetros</p></div>
      </section>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-base font-semibold text-slate-900">Vista previa del rack</h2><p className="mt-1 text-sm text-slate-500">Revisa la distribución frontal y la profundidad sin entrar al modo de edición.</p></div>
            <Badge className={positions.length > 0 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{positions.length > 0 ? "Listo para conteo" : "Sin posiciones"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="rack-front-preview-title">
              <div className="mb-3 flex items-start gap-2"><Grid3X3 className="mt-0.5 size-4 text-teal-700" aria-hidden="true" /><div><h3 id="rack-front-preview-title" className="text-sm font-semibold text-slate-800">Vista frontal</h3><p className="text-xs text-slate-500">Distribución de niveles y columnas.</p></div></div>
              <RackFrontView compartments={compartments} widthMm={rack.widthMm} heightMm={rack.heightMm} />
            </section>
            <RackSideView compartments={compartments} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2"><Ruler className="mt-0.5 size-4 text-slate-500" aria-hidden="true" /><div><h2 className="text-base font-semibold text-slate-900">Detalle de posiciones</h2><p className="mt-1 text-sm text-slate-500">{positions.length > 0 ? `${positions.length} posiciones activas de ${matrixPositions} esperadas por la matriz.` : "Todavía no se han generado posiciones físicas."}</p></div></div>
        </CardHeader>
        <CardContent>
          {compartments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center"><p className="text-sm font-medium text-slate-700">Este rack todavía no tiene compartimentos.</p><p className="mt-1 text-xs text-slate-500">Usa la configuración rápida para crear su estructura.</p><Link href={`/locations/racks/${id}/designer`} className="mt-3 inline-flex"><Button type="button" size="sm" variant="outline"><Paintbrush aria-hidden="true" /> Abrir diseñador</Button></Link></div>
          ) : (
            <div className="space-y-2">
              {compartments.map((compartment) => {
                const compartmentPositions = (compartment.depthSlots ?? []).flatMap((slot) => slot.positions ?? []);
                const expected = (compartment.columnCount ?? 1) * (compartment.stackLevels ?? 1) * (compartment.depthSlots?.length || 1);
                return <details key={compartment.id} className="group rounded-lg border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-teal-50 text-xs font-semibold text-teal-700">{compartment.code}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700">{compartment.name}</span><span className="block text-xs text-slate-400">{compartment.columnCount ?? 1} columnas × {compartment.stackLevels ?? 1} filas × {compartment.depthSlots?.length || 1} profundidad{(compartment.depthSlots?.length || 1) === 1 ? "" : "es"}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${compartmentPositions.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{compartmentPositions.length}/{expected} pos.</span>
                  </summary>
                  <div className="border-t border-slate-100 px-3 py-3">
                    {(compartment.depthSlots ?? []).length > 0 ? <div className="grid gap-2 sm:grid-cols-3">{compartment.depthSlots!.map((slot) => <div key={slot.id} className="rounded-md border border-slate-100 bg-slate-50 p-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-700">{slot.name}</span><span className="text-[10px] text-slate-400">{slot.code}</span></div><p className="mt-1 text-xs text-slate-500">{slot.positions?.length ?? 0} posiciones</p>{slot.positions?.length ? <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-y-auto">{slot.positions.map((position) => <code key={position.id} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500" title={`Columna ${position.columnIndex}, fila ${position.stackIndex}`}>{position.code}</code>)}</div> : <p className="mt-2 text-[11px] text-slate-400">Sin posiciones generadas.</p>}</div>)}</div> : <p className="text-xs text-slate-500">Sin slots de profundidad configurados.</p>}
                  </div>
                </details>;
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
