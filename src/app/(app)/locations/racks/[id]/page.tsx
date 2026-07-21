"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, Rows3, Paintbrush, LoaderCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RackFrontView } from "@/components/locations/rack-front-view";

export default function RackDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [rack, setRack] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/racks/${id}`);
      setRack(data.rack);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!rack) return <div className="py-16 text-center text-slate-500">Rack no encontrado.</div>;

  const path = rack.zone?.floor?.warehouse?.name
    ? `${rack.zone.floor.warehouse.name} / ${rack.zone.floor.name} / ${rack.zone.name}`
    : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={rack.zoneId ? `/locations/floors/${rack.zone.floorId}` : "/locations"} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{rack.name}</h1>
          {path && <p className="text-xs text-slate-400">{path}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{rack.code}</span>
          {rack.widthMm && <span className="text-xs text-slate-400">{rack.widthMm}mm</span>}
        </div>
        <Link href={`/locations/racks/${id}/designer`}>
          <Button size="sm" variant="outline"><Paintbrush size={14} /> Diseñar</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Vista frontal</CardTitle><CardDescription>Compartimentos del rack</CardDescription></CardHeader>
          <CardContent>
            {rack.compartments?.length > 0 ? (
              <RackFrontView compartments={rack.compartments} widthMm={rack.widthMm} heightMm={rack.heightMm} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-400">
                <Rows3 size={32} className="text-slate-200" />
                <p>Sin compartimentos diseñados.</p>
                <Link href={`/locations/racks/${id}/designer`}><Button size="sm" variant="outline"><Paintbrush size={14} /> Abrir diseñador</Button></Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posiciones</CardTitle><CardDescription>{rack.compartments?.flatMap((c: any) => c.depthSlots ?? []).length ?? 0} slots de profundidad</CardDescription></CardHeader>
          <CardContent>
            {rack.compartments?.map((comp: any) => (
              <div key={comp.id} className="mb-3 rounded-lg border border-slate-100 p-3">
                <p className="text-sm font-medium">{comp.name} <span className="text-xs text-slate-400">({comp.code})</span></p>
                {comp.depthSlots?.map((slot: any) => (
                  <div key={slot.id} className="ml-3 mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block size-2 rounded-full bg-teal-400" />
                    {slot.name} ({slot.code})
                    {slot.positions?.length > 0 && (
                      <span className="rounded bg-teal-50 px-1 py-0.5 text-teal-600">{slot.positions.length} pos.</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
