"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, MapPin, Plus, LoaderCircle, Rows3, Package } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FloorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [floor, setFloor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneCode, setZoneCode] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneCantidad, setZoneCantidad] = useState(1);
  const [creating, setCreating] = useState(false);

  const [showRackForm, setShowRackForm] = useState<string | null>(null);
  const [rackCode, setRackCode] = useState("");
  const [rackName, setRackName] = useState("");
  const [rackCantidad, setRackCantidad] = useState(1);
  const [creatingRack, setCreatingRack] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/floors/${id}`);
      setFloor(data.floor);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function generateZoneItems() {
    const count = Math.max(1, zoneCantidad);
    const digits = Math.max(2, String(count).length);
    return Array.from({ length: count }, (_, i) => {
      const num = String(i + 1).padStart(digits, "0");
      return {
        floorId: id,
        code: `${zoneCode}${num}`,
        name: `${zoneName} ${num}`,
        orderIndex: (floor?.zones.length ?? 0) + i,
      };
    });
  }

  async function addZone() {
    if (!zoneCode.trim() || !zoneName.trim()) return;
    setCreating(true);
    try {
      const items = generateZoneItems();
      await apiFetch("/api/zones", {
        method: "POST",
        body: JSON.stringify(items.length === 1 ? items[0] : items),
      });
      setZoneCode(""); setZoneName(""); setZoneCantidad(1); setShowZoneForm(false); await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  function generateRackItems(zoneId: string) {
    const count = Math.max(1, rackCantidad);
    const digits = Math.max(2, String(count).length);
    const zoneIndex = (floor?.zones ?? []).findIndex((z: any) => z.id === zoneId);
    const existingRacks = (floor?.zones ?? [])[zoneIndex]?.racks?.length ?? 0;
    return Array.from({ length: count }, (_, i) => {
      const num = String(i + 1).padStart(digits, "0");
      return {
        zoneId,
        code: `${rackCode}${num}`,
        name: `${rackName} ${num}`,
        orderIndex: existingRacks + i,
      };
    });
  }

  async function addRack(zoneId: string) {
    if (!rackCode.trim() || !rackName.trim()) return;
    setCreatingRack(true);
    try {
      const items = generateRackItems(zoneId);
      await apiFetch("/api/racks", {
        method: "POST",
        body: JSON.stringify(items.length === 1 ? items[0] : items),
      });
      setRackCode(""); setRackName(""); setRackCantidad(1); setShowRackForm(null); await load();
    } catch { /* silent */ }
    finally { setCreatingRack(false); }
  }

  const zonePreview = zoneCantidad > 1 && zoneCode.trim() && zoneName.trim()
    ? generateZoneItems().map(i => `${i.name} (${i.code})`).join(", ")
    : null;

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
        <Button size="sm" onClick={() => setShowZoneForm(!showZoneForm)}><Plus size={14} /> Añadir zona</Button>
      </div>

      {showZoneForm && (
        <Card><CardContent className="flex items-end gap-3 pt-4">
          <div><label className="mb-1 block text-xs font-medium text-slate-600">{zoneCantidad > 1 ? "Código base" : "Código"}</label><Input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} placeholder={zoneCantidad > 1 ? "Z" : "ZA"} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600">{zoneCantidad > 1 ? "Nombre base" : "Nombre"}</label><Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder={zoneCantidad > 1 ? "Zona" : "Zona A"} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label><Input type="number" min={1} max={100} value={zoneCantidad} onChange={(e) => setZoneCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="w-20" /></div>
          <Button onClick={() => void addZone()} disabled={creating}>{creating ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} {zoneCantidad > 1 ? `Crear ${zoneCantidad}` : "Crear"}</Button>
          {zonePreview && <p className="w-full pt-1 text-xs text-slate-400">Se crearán: {zonePreview}</p>}
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {(floor.zones ?? []).map((zone: any) => (
          <Card key={zone.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><MapPin size={16} />{zone.name} <span className="text-xs font-normal text-slate-400">({zone.code})</span></CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowRackForm(showRackForm === zone.id ? null : zone.id)}>
                  <Plus size={14} /> Añadir rack
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showRackForm === zone.id && (
                <div className="mb-4 flex items-end gap-3 rounded-lg border border-dashed border-teal-300 bg-teal-50 p-3">
                  <div><label className="mb-1 block text-xs font-medium text-slate-600">{rackCantidad > 1 ? "Código base" : "Código"}</label><Input value={rackCode} onChange={(e) => setRackCode(e.target.value)} placeholder={rackCantidad > 1 ? "R" : "R01"} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-600">{rackCantidad > 1 ? "Nombre base" : "Nombre"}</label><Input value={rackName} onChange={(e) => setRackName(e.target.value)} placeholder={rackCantidad > 1 ? "Rack" : "Rack 1"} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label><Input type="number" min={1} max={100} value={rackCantidad} onChange={(e) => setRackCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="w-20" /></div>
                  <Button onClick={() => void addRack(zone.id)} disabled={creatingRack}>{creatingRack ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} {rackCantidad > 1 ? `Crear ${rackCantidad}` : "Crear"}</Button>
                </div>
              )}
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
                <p className="text-xs text-slate-400">Sin racks. Haz clic en "Añadir rack" para crear uno nuevo.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
