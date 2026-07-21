"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, MapPin, Plus, LoaderCircle, Rows3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FloorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [floor, setFloor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [zoneCode, setZoneCode] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/floors/${id}`);
      setFloor(data.floor);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function addZone() {
    if (!zoneCode.trim() || !zoneName.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/zones", {
        method: "POST",
        body: JSON.stringify({ floorId: id, code: zoneCode, name: zoneName, orderIndex: floor?.zones.length ?? 0 }),
      });
      setZoneCode(""); setZoneName(""); setShowForm(false); await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!floor) return <div className="py-16 text-center text-slate-500">Piso no encontrado.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/locations/warehouses/${floor.warehouseId}`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{floor.name}</h1>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{floor.code}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{floor.zones?.length ?? 0} zona{(floor.zones?.length ?? 0) !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Añadir zona</Button>
      </div>

      {showForm && (
        <Card><CardContent className="flex items-end gap-3 pt-4">
          <div><label className="mb-1 block text-xs font-medium text-slate-600">Código</label><Input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} placeholder="ZA" /></div>
          <div className="flex-1"><label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label><Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Zona A" /></div>
          <Button onClick={() => void addZone()} disabled={creating}>{creating ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} Crear</Button>
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {(floor.zones ?? []).map((zone: any) => (
          <Card key={zone.id}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MapPin size={16} />{zone.name} <span className="text-xs font-normal text-slate-400">({zone.code})</span></CardTitle></CardHeader>
            <CardContent>
              {zone.racks?.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {zone.racks.map((rack: any) => (
                    <Link key={rack.id} href={`/locations/racks/${rack.id}`}>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-teal-300 hover:bg-teal-50">
                        <Rows3 size={14} className="text-slate-400" />
                        <span className="font-medium">{rack.name}</span>
                        <span className="text-xs text-slate-400">({rack.code})</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin racks. Crea racks desde la importación o desde la zona.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
