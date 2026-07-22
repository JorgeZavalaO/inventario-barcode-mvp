"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, LoaderCircle, MapPin, Rows3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FloorData = {
  id: string; code: string; name: string; warehouseName: string;
  zones: { id: string; code: string; name: string;
    racks: { id: string; code: string; name: string; positions?: { id: string }[]; compartments?: { depthSlots?: { positions?: { id: string }[] }[] }[] }[];
  }[];
};

export default function NewV2SessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<"total" | "floor" | "rack" | "positions">("total");
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [allRacks, setAllRacks] = useState<{ id: string; code: string; name: string; floorName: string; positionCount: number }[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { (async () => {
    try {
      const [whData, posData] = await Promise.all([
        apiFetch<{ warehouses: any[] }>("/api/warehouses"),
        apiFetch<{ positions: any[] }>("/api/positions"),
      ]);
      const allFloors = whData.warehouses.flatMap((w: any) =>
        w.floors.map((f: any) => ({
          ...f, warehouseName: w.name,
          zones: f.zones || [],
        }))
      ) as FloorData[];
      setFloors(allFloors);
      const racks = allFloors.flatMap((f) =>
        f.zones.flatMap((z) =>
          z.racks.map((r) => {
            const posCount = r.positions?.length ?? r.compartments?.reduce((s, c) => s + (c.depthSlots?.reduce((s2, d) => s2 + (d.positions?.length ?? 0), 0) ?? 0), 0) ?? 0;
            return { id: r.id, code: r.code, name: r.name, floorName: f.name, positionCount: posCount };
          })
        )
      );
      setAllRacks(racks);
      setPositions(posData.positions);
    } catch { /* silent */ }
    finally { setLoading(false); }
  })(); }, []);

  async function create() {
    if (!name.trim()) { setToast("Ingresa un nombre"); return; }
    setCreating(true);
    try {
      const result = await apiFetch<any>("/api/sessions/v2", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          scopeType,
          scopeIds: scopeType !== "total" ? selectedIds : undefined,
        }),
      });
      router.push(`/sessions/v2/${result.session.id}/scan`);
    } catch (e: any) {
      setToast(e.message ?? "Error al crear");
    } finally { setCreating(false); }
  }

  function toggleId(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  function toggleAllRacksInFloor(floorId: string, checked: boolean) {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return;
    const rackIds = floor.zones.flatMap((z) => z.racks.map((r) => r.id));
    if (checked) setSelectedIds((prev) => [...new Set([...prev, ...rackIds])]);
    else setSelectedIds((prev) => prev.filter((id) => !rackIds.includes(id)));
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;

  const totalPositions = scopeType === "total" ? positions.length
    : scopeType === "floor" ? allRacks.filter((r) => selectedIds.includes(r.id)).reduce((s, r) => s + r.positionCount, 0)
    : scopeType === "rack" ? allRacks.filter((r) => selectedIds.includes(r.id)).reduce((s, r) => s + r.positionCount, 0)
    : selectedIds.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v2" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold tracking-tight">Nueva sesión V2</h1>
      </div>

      {toast && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{toast}</p>}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la sesión</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inventario mensual Piso 1" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Alcance</label>
            <div className="flex flex-wrap gap-2">
              {(["total", "floor", "rack", "positions"] as const).map((type) => (
                <button key={type} onClick={() => { setScopeType(type); setSelectedIds([]); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${scopeType === type ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  {type === "total" ? "Todo el almacén" : type === "floor" ? "Por piso" : type === "rack" ? "Por rack" : "Posiciones específicas"}
                </button>
              ))}
            </div>
          </div>

          {scopeType === "floor" && (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {floors.length === 0 ? <p className="text-sm text-slate-400">No hay pisos registrados.</p> :
                floors.map((floor) => {
                  const floorRacks = floor.zones.flatMap((z) => z.racks);
                  const selectedRacksInFloor = floorRacks.filter((r) => selectedIds.includes(r.id));
                  const allSelected = selectedRacksInFloor.length === floorRacks.length && floorRacks.length > 0;
                  return (
                    <div key={floor.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={allSelected} onChange={(e) => toggleAllRacksInFloor(floor.id, e.target.checked)}
                            className="rounded" />
                          <p className="text-sm font-medium">{floor.warehouseName} / {floor.name} ({floor.code})</p>
                          <span className="text-xs text-slate-400">{floorRacks.length} racks</span>
                        </div>
                      </div>
                      <div className="ml-6 mt-2 space-y-1">
                        {floorRacks.length === 0 && <p className="text-xs text-slate-400">Sin racks.</p>}
                        {floorRacks.map((rack) => {
                          const hasPositions = rack.positions?.length ?? rack.compartments?.reduce((s, c) => s + (c.depthSlots?.reduce((s2, d) => s2 + (d.positions?.length ?? 0), 0) ?? 0), 0) ?? 0 > 0;
                          return (
                            <label key={rack.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer ${!hasPositions ? "opacity-40" : "hover:bg-slate-50"}`}>
                              <input type="checkbox" checked={selectedIds.includes(rack.id)} onChange={() => toggleId(rack.id)}
                                disabled={!hasPositions} className="rounded" />
                              <Rows3 size={14} className="shrink-0 text-slate-400" />
                              <span className="truncate">{rack.name} ({rack.code})</span>
                              {!hasPositions && <span className="ml-auto text-xs italic text-slate-400">sin posiciones</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {scopeType === "rack" && (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {allRacks.length === 0 ? <p className="text-sm text-slate-400">No hay racks registrados.</p> :
                allRacks.map((rack) => (
                  <label key={rack.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer ${rack.positionCount === 0 ? "opacity-40" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={selectedIds.includes(rack.id)} onChange={() => toggleId(rack.id)}
                      disabled={rack.positionCount === 0} className="rounded" />
                    <Rows3 size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{rack.name} ({rack.code})</span>
                    <span className="ml-auto text-xs text-slate-400">{rack.floorName}</span>
                    {rack.positionCount === 0 && <span className="ml-1 text-xs italic text-slate-400">sin posiciones</span>}
                  </label>
                ))}
            </div>
          )}

          {scopeType === "positions" && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {positions.length === 0 ? <p className="text-sm text-slate-400">No hay posiciones registradas.</p> :
                positions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleId(p.id)} className="rounded" />
                    {p.code}
                  </label>
                ))}
            </div>
          )}

          <p className="text-xs text-slate-500">Total: {totalPositions} posiciones</p>

          <Button className="w-full" onClick={() => void create()} disabled={creating || (scopeType !== "total" && selectedIds.length === 0)}>
            {creating ? <LoaderCircle className="animate-spin" size={14} /> : <MapPin size={14} />}
            Crear sesión V2 ({totalPositions} posiciones)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
