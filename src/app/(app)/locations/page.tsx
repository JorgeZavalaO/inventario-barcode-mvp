"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { Building2, Layers, MapPin, Plus, LoaderCircle, Printer, Trash2, Warehouse } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WarehouseNode = {
  id: string;
  code: string;
  name: string;
  floors: {
    id: string;
    code: string;
    name: string;
    zones: {
      id: string;
      code: string;
      name: string;
      racks: { id: string; code: string; name: string; active: boolean }[];
    }[];
  }[];
};

export default function LocationsPage() {
  const [tree, setTree] = useState<WarehouseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ warehouses: WarehouseNode[] }>("/api/warehouses");
      setTree(data.warehouses);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  async function handleDeleteWarehouse(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el almacén "${name}"? Se desactivarán todos sus pisos, zonas y racks.`)) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/warehouses/${id}`, { method: "DELETE" });
      await load();
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    if (!newCode.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/warehouses", {
        method: "POST",
        body: JSON.stringify({ code: newCode, name: newName }),
      });
      setNewCode(""); setNewName(""); setShowForm(false);
      await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ubicaciones</h1>
          <p className="mt-1 text-sm text-slate-500">Almacenes, pisos, zonas y racks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/locations/labels">
            <Button variant="outline" size="sm"><Printer size={14} /> Etiquetas</Button>
          </Link>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> {showForm ? "Cancelar" : "Nuevo almacén"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Código</label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="AP" />
              </div>
              <div className="flex-[2]">
                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Almacén principal" />
              </div>
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
                Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando ubicaciones...
        </div>
      ) : tree.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Building2 className="text-slate-300" size={48} />
            <p className="text-sm text-slate-500">No hay almacenes registrados.</p>
            <Button onClick={() => setShowForm(true)}><Plus size={16} /> Crear primer almacén</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tree.map((wh) => (
            <Card key={wh.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Warehouse size={20} />
                  </div>
                  <div className="flex-1">
                    <Link href={`/locations/warehouses/${wh.id}`} className="font-semibold hover:text-teal-600">
                      {wh.name}
                    </Link>
                    <CardDescription>{wh.code} · {wh.floors.length} piso{wh.floors.length !== 1 ? "s" : ""}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-red-500" disabled={deleting === wh.id} onClick={() => void handleDeleteWarehouse(wh.id, wh.name)}>
                    {deleting === wh.id ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wh.floors.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin pisos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {wh.floors.map((floor) => (
                      <div key={floor.id} className="rounded-lg border border-slate-100 p-3">
                        <Link href={`/locations/floors/${floor.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-teal-600">
                          <Layers size={14} /> {floor.name} <span className="text-xs text-slate-400">({floor.code})</span>
                        </Link>
                        {floor.zones.length > 0 && (
                          <div className="ml-5 mt-1 space-y-1">
                            {floor.zones.map((zone) => (
                              <div key={zone.id} className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin size={12} /> {zone.name}
                                <span className="text-slate-300">· {zone.racks.length} rack{zone.racks.length !== 1 ? "s" : ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
