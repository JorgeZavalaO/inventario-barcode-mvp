"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, Layers, Plus, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WarehouseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [warehouse, setWarehouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [floorCode, setFloorCode] = useState("");
  const [floorName, setFloorName] = useState("");
  const [floorCantidad, setFloorCantidad] = useState(1);
  const [creating, setCreating] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/warehouses/${id}`);
      setWarehouse(data.warehouse);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function generateFloorItems() {
    const count = Math.max(1, floorCantidad);
    const digits = Math.max(2, String(count).length);
    return Array.from({ length: count }, (_, i) => {
      const num = String(i + 1).padStart(digits, "0");
      return {
        warehouseId: id,
        code: `${floorCode}${num}`,
        name: `${floorName} ${num}`,
        orderIndex: (warehouse?.floors.length ?? 0) + i,
      };
    });
  }

  async function addFloor() {
    if (!floorCode.trim() || !floorName.trim()) return;
    setCreating(true);
    try {
      const items = generateFloorItems();
      await apiFetch("/api/floors", {
        method: "POST",
        body: JSON.stringify(items.length === 1 ? items[0] : items),
      });
      setFloorCode(""); setFloorName(""); setFloorCantidad(1); setShowFloorForm(false); await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  async function handleDeleteFloor(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el piso "${name}"? Se desactivarán todas sus zonas y racks.`)) return;
    setDeletingFloor(id);
    try {
      await apiFetch(`/api/floors/${id}`, { method: "DELETE" });
      await load();
    } catch { /* silent */ }
    finally { setDeletingFloor(null); }
  }

  const floorPreview = floorCantidad > 1 && floorCode.trim() && floorName.trim()
    ? generateFloorItems().map(i => `${i.name} (${i.code})`).join(", ")
    : null;

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!warehouse) return <div className="py-16 text-center text-slate-500">Almacén no encontrado.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/locations" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{warehouse.name}</h1>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{warehouse.code}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{warehouse.floors?.length ?? 0} piso{(warehouse.floors?.length ?? 0) !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowFloorForm(!showFloorForm)}><Plus size={14} /> Añadir piso</Button>
      </div>

      {showFloorForm && (
        <Card><CardContent className="flex items-end gap-3 pt-4">
          <div><label className="mb-1 block text-xs font-medium text-slate-600">{floorCantidad > 1 ? "Código base" : "Código"}</label><Input value={floorCode} onChange={(e) => setFloorCode(e.target.value)} placeholder={floorCantidad > 1 ? "P" : "P01"} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600">{floorCantidad > 1 ? "Nombre base" : "Nombre"}</label><Input value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder={floorCantidad > 1 ? "Piso" : "Piso 1"} /></div>
          <div><label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label><Input type="number" min={1} max={100} value={floorCantidad} onChange={(e) => setFloorCantidad(Math.max(1, parseInt(e.target.value) || 1))} className="w-20" /></div>
          <Button onClick={() => void addFloor()} disabled={creating}>{creating ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} {floorCantidad > 1 ? `Crear ${floorCantidad}` : "Crear"}</Button>
          {floorPreview && <p className="w-full pt-1 text-xs text-slate-400">Se crearán: {floorPreview}</p>}
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(warehouse.floors ?? []).map((floor: any) => (
          <Card key={floor.id} className="relative">
            <Link href={`/locations/floors/${floor.id}`} className="block cursor-pointer transition hover:shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers size={16} />{floor.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-500">
                <p>{floor.code} · {floor.zones?.length ?? 0} zona{(floor.zones?.length ?? 0) !== 1 ? "s" : ""}</p>
                {floor.zones?.map((z: any) => <span key={z.id} className="mr-2 inline-flex items-center gap-1 text-xs"><MapPin size={10} />{z.name}</span>)}
              </CardContent>
            </Link>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 size-7 text-slate-400 hover:text-red-500" disabled={deletingFloor === floor.id} onClick={() => void handleDeleteFloor(floor.id, floor.name)}>
              {deletingFloor === floor.id ? <LoaderCircle className="animate-spin" size={12} /> : <Trash2 size={12} />}
            </Button>
          </Card>
        ))}
        {(!warehouse.floors || warehouse.floors.length === 0) && (
          <Card><CardContent className="py-8 text-center text-sm text-slate-400">Sin pisos. Crea el primer piso.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
