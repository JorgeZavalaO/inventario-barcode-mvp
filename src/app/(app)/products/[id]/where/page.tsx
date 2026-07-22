"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, MapPin, Package, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StockWithPosition = {
  id: string;
  theoreticalStock: number;
  isPrimary: boolean;
  position: {
    id: string; code: string;
    compartment: { name: string };
    depthSlot: { name: string; kind: string };
    rack: { id: string; code: string; name: string; zone: { name: string; floor: { name: string; warehouse: { name: string } } } };
  };
};

export default function ProductWherePage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [stocks, setStocks] = useState<StockWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"all" | "theoretical" | "counted">("all");

  const load = useCallback(async () => {
    try {
      const [prodData, stockData] = await Promise.all([
        apiFetch<any>(`/api/products/${id}`),
        apiFetch<{ stocks: StockWithPosition[] }>(`/api/product-locations?productId=${id}`),
      ]);
      setProduct(prodData.product);
      setStocks(stockData.stocks);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...</div>;
  if (!product) return <div className="py-16 text-center text-slate-500">Producto no encontrado.</div>;

  const totalStock = stocks.reduce((s, st) => s + st.theoreticalStock, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{product.description}</h1>
          <p className="text-xs text-slate-400">{product.code}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
          <Button size="sm" variant={view === "all" ? "default" : "ghost"} onClick={() => setView("all")}>Todo</Button>
          <Button size="sm" variant={view === "theoretical" ? "default" : "ghost"} onClick={() => setView("theoretical")}>
            <Eye size={12} /> Teórico
          </Button>
          <Button size="sm" variant={view === "counted" ? "default" : "ghost"} onClick={() => setView("counted")}>
            <EyeOff size={12} /> Contado
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Total stock teórico: <span className="font-semibold">{totalStock} {product.unit}</span>
        {view !== "all" && <span className="ml-2 text-xs text-slate-400">(mostrando solo {view === "theoretical" ? "teórico" : "contado"})</span>}
      </p>

      {stocks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-400">
          <Package size={32} className="mx-auto mb-2 text-slate-200" />
          Este producto no tiene ubicaciones asignadas.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {stocks
            .filter((st) => view === "all" || (view === "theoretical" && st.theoreticalStock > 0) || (view === "counted" && st.theoreticalStock >= 0))
            .map((st) => {
              const pos = st.position;
              return (
                <Link key={st.id} href={`/locations/racks/${pos.rack.id}`}>
                  <Card className="cursor-pointer transition hover:shadow-md">
                    <CardContent className="flex items-start gap-4 py-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                        <MapPin size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pos.code}</span>
                          {st.isPrimary && <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200">Principal</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">{pos.rack.zone.floor.warehouse.name}</p>
                        <p className="text-xs text-slate-400">
                          {pos.rack.zone.floor.name} / {pos.rack.zone.name} / {pos.rack.name} ({pos.rack.code})
                        </p>
                        <p className="text-xs text-slate-400">{pos.compartment.name} · Prof: {pos.depthSlot.name}</p>
                        {view === "counted" && <p className="mt-1 text-xs text-amber-600">Esperando conteo físico</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-600">{st.theoreticalStock}</p>
                        <p className="text-xs text-slate-400">{product.unit}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
