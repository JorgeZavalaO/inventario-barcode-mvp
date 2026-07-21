"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, Layers, Plus, LoaderCircle, MapPin } from "lucide-react";
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
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/api/warehouses/${id}`);
      setWarehouse(data.warehouse);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function addFloor() {
    if (!floorCode.trim() || !floorName.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/floors", {
        method: "POST",
        body: JSON.stringify({ warehouseId: id, code: floorCode, name: floorName, orderIndex: warehouse?.floors.length ?? 0 }),
      });
      setFloorCode(""); setFloorName(""); setShowFloorForm(false); await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

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
          <div><label className="mb-1 block text-xs font-medium text-slate-600">Código</label><Input value={floorCode} onChange={(e) => setFloorCode(e.target.value)} placeholder="P01" /></div>
          <div className="flex-1"><label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label><Input value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="Piso 1" /></div>
          <Button onClick={() => void addFloor()} disabled={creating}>{creating ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} Crear</Button>
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(warehouse.floors ?? []).map((floor: any) => (
          <Link key={floor.id} href={`/locations/floors/${floor.id}`}>
            <Card className="cursor-pointer transition hover:shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers size={16} />{floor.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-500">
                <p>{floor.code} · {floor.zones?.length ?? 0} zona{(floor.zones?.length ?? 0) !== 1 ? "s" : ""}</p>
                {floor.zones?.map((z: any) => <span key={z.id} className="mr-2 inline-flex items-center gap-1 text-xs"><MapPin size={10} />{z.name}</span>)}
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!warehouse.floors || warehouse.floors.length === 0) && (
          <Card><CardContent className="py-8 text-center text-sm text-slate-400">Sin pisos. Crea el primer piso.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
