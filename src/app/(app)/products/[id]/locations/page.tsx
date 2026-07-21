"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, MapPin, Plus, LoaderCircle, Trash2, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StockItem = {
  id: string;
  theoreticalStock: number;
  minimumStock: number | null;
  isPrimary: boolean;
  source: string | null;
  product: { id: string; code: string; description: string; unit: string };
  position: {
    id: string; code: string;
    rack: { id: string; code: string; name: string; zone: { code: string; name: string; floor: { code: string; name: string; warehouse: { code: string; name: string } } } };
  };
};

export default function ProductLocationsPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [allPositions, setAllPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selPosition, setSelPosition] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const [prodData, stockData, posData] = await Promise.all([
        apiFetch<any>(`/api/products/${id}`),
        apiFetch<{ stocks: StockItem[] }>(`/api/product-locations?productId=${id}`),
        apiFetch<{ positions: any[] }>("/api/positions"),
      ]);
      setProduct(prodData.product);
      setStocks(stockData.stocks);
      setAllPositions(posData.positions);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); }, [toast]);

  async function addStock() {
    if (!selPosition) return;
    setCreating(true);
    try {
      await apiFetch("/api/product-locations", {
        method: "POST",
        body: JSON.stringify({ productId: id, positionId: selPosition, theoreticalStock: parseFloat(stockQty) || 0 }),
      });
      setSelPosition(""); setStockQty("0"); setShowForm(false); await load();
      setToast("Stock asignado");
    } catch { setToast("Error"); }
    finally { setCreating(false); }
  }

  async function removeStock(positionId: string) {
    try {
      await apiFetch(`/api/product-locations?productId=${id}&positionId=${positionId}`, { method: "DELETE" });
      await load();
      setToast("Stock eliminado");
    } catch { setToast("Error"); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!product) return <div className="py-16 text-center text-slate-500">Producto no encontrado.</div>;

  const totalStock = stocks.reduce((s, st) => s + st.theoreticalStock, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/products`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{product.description}</h1>
          <p className="text-xs text-slate-400">{product.code}</p>
        </div>
        {toast && <span className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-600">{toast}</span>}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stock por ubicación</CardTitle>
              <CardDescription>{stocks.length} posición{stocks.length !== 1 ? "es" : ""} · Total: {totalStock} {product.unit}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Asignar</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-4 flex items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Posición</label>
                <select value={selPosition} onChange={(e) => setSelPosition(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                  <option value="">Seleccionar...</option>
                  {allPositions.filter((p) => !stocks.some((s) => s.position.id === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.code}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="mb-1 block text-xs font-medium text-slate-600">Stock</label>
                <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} min={0} />
              </div>
              <Button onClick={() => void addStock()} disabled={creating}>
                {creating ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} Asignar
              </Button>
            </div>
          )}

          {stocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Este producto no tiene stock asignado a ninguna posición.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stocks.map((st) => {
                const pos = st.position;
                const path = `${pos.rack.zone.floor.warehouse.code} / ${pos.rack.zone.floor.code} / ${pos.rack.code}`;
                return (
                  <div key={st.id} className="flex items-center gap-3 py-3">
                    <MapPin size={16} className="shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/locations/racks/${pos.rack.id}`} className="text-sm font-medium text-teal-600 hover:underline">{pos.code}</Link>
                        {st.isPrimary && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">Principal</span>}
                      </div>
                      <p className="truncate text-xs text-slate-500">{path}</p>
                    </div>
                    <span className="text-sm font-semibold">{st.theoreticalStock} {product.unit}</span>
                    <button onClick={() => void removeStock(st.position.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
