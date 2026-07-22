"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, LoaderCircle, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewV2SessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<"total" | "floor" | "rack" | "positions">("total");
  const [floors, setFloors] = useState<any[]>([]);
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
      const allFloors = whData.warehouses.flatMap((w) => w.floors.map((f: any) => ({ ...f, warehouseName: w.name })));
      setFloors(allFloors);
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

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
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
              {(["total", "floor", "positions"] as const).map((type) => (
                <button key={type} onClick={() => { setScopeType(type); setSelectedIds([]); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${scopeType === type ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  {type === "total" ? "Todo el almacén" : type === "floor" ? "Por piso" : "Posiciones específicas"}
                </button>
              ))}
            </div>
          </div>

          {scopeType === "floor" && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {floors.length === 0 ? <p className="text-sm text-slate-400">No hay pisos registrados.</p> :
                floors.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => toggleId(f.id)} className="rounded" />
                    {f.warehouseName} / {f.name} ({f.code})
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

          <Button className="w-full" onClick={() => void create()} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={14} /> : <MapPin size={14} />}
            Crear sesión V2
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
