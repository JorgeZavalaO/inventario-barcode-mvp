"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, LoaderCircle, MapPin, Rows3, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FloorData = {
  id: string; code: string; name: string; warehouseName: string;
  zones: { id: string; code: string; name: string;
    racks: { id: string; code: string; name: string; positionCount?: number }[];
    positionCount?: number;
  }[];
};

type ActivePosition = { id: string; rackId: string; code: string };
type RawWarehouse = { id: string; name: string; floors?: RawFloor[] };
type RawFloor = { id: string; code: string; name: string; zones?: RawZone[] };
type RawZone = { id: string; code: string; name: string; racks?: RawRack[] };
type RawRack = { id: string; code: string; name: string };
type WarehouseResponse = { warehouses: RawWarehouse[] };
type CreateSessionResponse = { session: { id: string } };

export default function NewV2SessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<"total" | "floor" | "zone" | "rack" | "positions">("total");
  const [floors, setFloors] = useState<FloorData[]>([]);
  const [allRacks, setAllRacks] = useState<{ id: string; code: string; name: string; floorName: string; positionCount: number }[]>([]);
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { (async () => {
    try {
      const [whData, posData] = await Promise.all([
        apiFetch<WarehouseResponse>("/api/warehouses"),
        apiFetch<{ positions: ActivePosition[] }>("/api/positions"),
      ]);
      const positionCountByRack = new Map<string, number>();
      for (const position of posData.positions) {
        positionCountByRack.set(position.rackId, (positionCountByRack.get(position.rackId) ?? 0) + 1);
      }
      const allFloors = whData.warehouses.flatMap((w) =>
        (w.floors ?? []).map((f) => ({
          ...f, warehouseName: w.name,
          zones: (f.zones ?? []).map((z) => ({
            ...z,
            racks: (z.racks ?? []).map((r) => ({
              ...r,
              positionCount: positionCountByRack.get(r.id) ?? 0,
            })),
            positionCount: (z.racks ?? []).reduce((s, r) => s + (positionCountByRack.get(r.id) ?? 0), 0),
          })),
        }))
      ) as FloorData[];
      setFloors(allFloors);
      const racks = allFloors.flatMap((f) =>
        f.zones.flatMap((z) =>
          z.racks.map((r) => ({ id: r.id, code: r.code, name: r.name, floorName: f.name, positionCount: r.positionCount ?? 0 }))
        )
      );
      setAllRacks(racks);
      setPositions(posData.positions);
    } catch { /* silent */ }
    finally { setLoading(false); }
  })(); }, []);

  const create = useCallback(async () => {
    if (!name.trim()) { setToast("Ingresa un nombre"); return; }
    setCreating(true);
    setToast("");
    try {
      const requestScopeType = scopeType === "floor" || scopeType === "zone" ? scopeType : scopeType;
      const result = await apiFetch<CreateSessionResponse>("/api/sessions/v2", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          scopeType: requestScopeType,
          scopeIds: requestScopeType !== "total" ? selectedIds : undefined,
        }),
      });
      router.push(`/sessions/v2/${result.session.id}/scan`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al crear");
    } finally { setCreating(false); }
  }, [name, scopeType, selectedIds, router]);

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

  function toggleAllRacksInZone(zoneId: string, checked: boolean) {
    const floor = floors.find((f) => f.zones.some((z) => z.id === zoneId));
    const zone = floor?.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const rackIds = zone.racks.map((r) => r.id);
    if (checked) setSelectedIds((prev) => [...new Set([...prev, ...rackIds])]);
    else setSelectedIds((prev) => prev.filter((id) => !rackIds.includes(id)));
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;

  const totalPositions = scopeType === "total" ? positions.length
    : scopeType === "floor" ? floors.flatMap((f) => f.zones).flatMap((z) => z.racks).filter((r) => selectedIds.includes(r.id)).reduce((s, r) => s + (r.positionCount ?? 0), 0)
    : scopeType === "zone" ? allRacks.filter((r) => selectedIds.includes(r.id)).reduce((s, r) => s + r.positionCount, 0)
    : scopeType === "rack" ? allRacks.filter((r) => selectedIds.includes(r.id)).reduce((s, r) => s + r.positionCount, 0)
    : selectedIds.length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v2" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold tracking-tight">Nueva sesión V2</h1>
      </div>

      {toast && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{toast}</p>}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la sesión</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inventario mensual Piso 1" className="h-11" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Alcance</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "total" as const, label: "Todo el almacén" },
                { value: "floor" as const, label: "Por piso" },
                { value: "zone" as const, label: "Por zona" },
                { value: "rack" as const, label: "Por rack" },
                { value: "positions" as const, label: "Posiciones" },
              ]).map((type) => (
                <button key={type.value} onClick={() => { setScopeType(type.value); setSelectedIds([]); }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium min-h-[44px] ${scopeType === type.value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {scopeType === "floor" && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {floors.length === 0 ? <p className="text-sm text-slate-400">No hay pisos registrados.</p> :
                floors.map((floor) => {
                  const floorRacks = floor.zones.flatMap((z) => z.racks);
                  const selectedRacksInFloor = floorRacks.filter((r) => selectedIds.includes(r.id));
                  const allSelected = selectedRacksInFloor.length === floorRacks.length && floorRacks.length > 0;
                  return (
                    <div key={floor.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={allSelected} onChange={(e) => toggleAllRacksInFloor(floor.id, e.target.checked)} className="h-5 w-5 rounded" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{floor.warehouseName} / {floor.name}</p>
                          <p className="text-xs text-slate-400">{floorRacks.length} racks</p>
                        </div>
                      </div>
                      <div className="ml-7 mt-2 space-y-1">
                        {floorRacks.length === 0 && <p className="text-xs text-slate-400">Sin racks.</p>}
                        {floorRacks.map((rack) => {
                          const hasPositions = (rack.positionCount ?? 0) > 0;
                          return (
                            <label key={rack.id} className={`flex items-center gap-2 rounded px-2 py-2 text-sm cursor-pointer min-h-[44px] ${!hasPositions ? "opacity-40" : "hover:bg-slate-50"}`}>
                              <input type="checkbox" checked={selectedIds.includes(rack.id)} onChange={() => toggleId(rack.id)} disabled={!hasPositions} className="h-4 w-4 rounded" />
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

          {scopeType === "zone" && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {floors.length === 0 ? <p className="text-sm text-slate-400">No hay pisos registrados.</p> :
                floors.map((floor) => (
                  <div key={floor.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">{floor.warehouseName} / {floor.name}</p>
                    <div className="space-y-1">
                      {floor.zones.map((zone) => {
                        const zoneRacks = zone.racks;
                        const selectedRacksInZone = zoneRacks.filter((r) => selectedIds.includes(r.id));
                        const allSelected = selectedRacksInZone.length === zoneRacks.length && zoneRacks.length > 0;
                        const hasPositions = (zone.positionCount ?? 0) > 0;
                        return (
                          <div key={zone.id} className={`rounded-lg border border-slate-100 p-2 ${!hasPositions ? "opacity-40" : ""}`}>
                            <div className="flex items-center gap-2 min-h-[44px]">
                              <input type="checkbox" checked={allSelected} onChange={(e) => toggleAllRacksInZone(zone.id, e.target.checked)} disabled={!hasPositions} className="h-5 w-5 rounded" />
                              <Warehouse size={14} className="shrink-0 text-slate-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{zone.name} ({zone.code})</p>
                                <p className="text-xs text-slate-400">{zoneRacks.length} racks · {zone.positionCount ?? 0} posiciones</p>
                              </div>
                            </div>
                            <div className="ml-7 mt-1 space-y-1">
                              {zoneRacks.map((rack) => {
                                const hasRackPositions = (rack.positionCount ?? 0) > 0;
                                return (
                                  <label key={rack.id} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer min-h-[40px] ${!hasRackPositions ? "opacity-40" : "hover:bg-slate-50"}`}>
                                    <input type="checkbox" checked={selectedIds.includes(rack.id)} onChange={() => toggleId(rack.id)} disabled={!hasRackPositions} className="h-4 w-4 rounded" />
                                    <Rows3 size={12} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{rack.name} ({rack.code})</span>
                                    {!hasRackPositions && <span className="ml-auto text-xs italic text-slate-400">sin posiciones</span>}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {scopeType === "rack" && (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {allRacks.length === 0 ? <p className="text-sm text-slate-400">No hay racks registrados.</p> :
                allRacks.map((rack) => (
                  <label key={rack.id} className={`flex items-center gap-2 rounded px-2 py-2 text-sm cursor-pointer min-h-[44px] ${rack.positionCount === 0 ? "opacity-40" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={selectedIds.includes(rack.id)} onChange={() => toggleId(rack.id)} disabled={rack.positionCount === 0} className="h-5 w-5 rounded" />
                    <Rows3 size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{rack.name} ({rack.code})</span>
                    <span className="ml-auto text-xs text-slate-400">{rack.floorName}</span>
                    {rack.positionCount === 0 && <span className="ml-1 text-xs italic text-slate-400">sin posiciones</span>}
                  </label>
                ))}
            </div>
          )}

          {scopeType === "positions" && (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {positions.length === 0 ? <p className="text-sm text-slate-400">No hay posiciones registradas.</p> :
                positions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleId(p.id)} className="h-5 w-5 rounded" />
                    {p.code}
                  </label>
                ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-600">Total: <span className="font-bold text-slate-900">{totalPositions}</span> posiciones</p>
          </div>

          <Button className="h-12 w-full text-base" onClick={() => void create()} disabled={creating || (scopeType !== "total" && selectedIds.length === 0)}>
            {creating ? <LoaderCircle className="mr-2 animate-spin" size={16} /> : <MapPin size={16} className="mr-2" />}
            Crear sesión ({totalPositions} posiciones)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
