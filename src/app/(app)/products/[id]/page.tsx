"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  LoaderCircle,
  Package,
  Building2,
  Boxes,
  MapPin,
  BarChart3,
  Tag,
  Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProductData = {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  unit: string;
  category: string | null;
  supplierCode: string | null;
  theoreticalStock: number;
  active: boolean;
};

type BoxData = {
  boxId: string;
  boxNumber: string;
  expectedQty: number | null;
  supplierCode: string | null;
};

type PalletData = {
  palletId: string;
  palletNumber: string;
  boxes: BoxData[];
};

type ImportData = {
  importId: string;
  importCode: string;
  importDescription: string | null;
  pallets: PalletData[];
};

type LocationData = {
  positionId: string;
  positionCode: string;
  theoreticalStock: number;
  minimumStock: number | null;
  isPrimary: boolean;
  source: string | null;
  warehouse: string;
  floor: string;
  zone: string;
  rack: string;
  path: string;
};

type DetailsResponse = {
  product: ProductData;
  imports: ImportData[];
  locations: LocationData[];
  summary: {
    totalImportBoxes: number;
    totalLocations: number;
    totalStock: number;
  };
};

type Tab = "info" | "imports" | "locations";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<DetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<DetailsResponse>(`/api/products/${id}/details`);
      setData(result);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );

  if (!data)
    return <div className="py-20 text-center text-slate-500">Producto no encontrado.</div>;

  const { product, imports, locations, summary } = data;
  const totalBoxes = imports.reduce((sum, imp) =>
    sum + imp.pallets.reduce((ps, pal) => ps + pal.boxes.length, 0), 0,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/products" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{product.description}</h1>
            <p className="text-[11px] text-slate-400">{product.code}</p>
          </div>
          <Badge variant={product.active ? "default" : "secondary"}>
            {product.active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Boxes size={16} className="text-blue-600" />
                <p className="text-xl font-bold text-blue-700">{totalBoxes}</p>
              </div>
              <p className="text-[11px] text-slate-500">Cajas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MapPin size={16} className="text-emerald-600" />
                <p className="text-xl font-bold text-emerald-700">{summary.totalLocations}</p>
              </div>
              <p className="text-[11px] text-slate-500">Ubicaciones</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BarChart3 size={16} className="text-purple-600" />
                <p className="text-xl font-bold text-purple-700">{summary.totalStock}</p>
              </div>
              <p className="text-[11px] text-slate-500">Stock total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {([
            { key: "info" as Tab, label: "Información", icon: Tag },
            { key: "imports" as Tab, label: "Importaciones", icon: Boxes },
            { key: "locations" as Tab, label: "Ubicaciones", icon: MapPin },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-teal-50 text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {activeTab === "info" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <InfoRow label="Código" value={product.code} />
                {product.barcode && <InfoRow label="Barcode" value={product.barcode} />}
                <InfoRow label="Descripción" value={product.description} />
                <InfoRow label="Unidad" value={product.unit} />
                {product.category && <InfoRow label="Categoría" value={product.category} />}
                {product.supplierCode && <InfoRow label="Código proveedor" value={product.supplierCode} />}
                <InfoRow label="Stock teórico" value={String(product.theoreticalStock)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab: Imports */}
        {activeTab === "imports" && (
          <>
            {imports.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-10 text-center text-sm text-slate-400">
                  <Boxes size={32} className="mx-auto mb-2 text-slate-200" />
                  Este producto no tiene importaciones asociadas.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {imports.map((imp) => (
                  <Card key={imp.importId} className="border-0 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-blue-600" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{imp.importCode}</p>
                          {imp.importDescription && imp.importDescription !== imp.importCode && (
                            <p className="text-[11px] text-slate-400">{imp.importDescription}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-auto text-[11px]">
                          {imp.pallets.length} pallet{imp.pallets.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {imp.pallets.map((pal) => (
                          <div key={pal.palletId} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Package size={14} className="text-slate-500" />
                              <p className="text-xs font-semibold text-slate-700">{pal.palletNumber}</p>
                              <span className="text-[11px] text-slate-400">
                                · {pal.boxes.length} caja{pal.boxes.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {pal.boxes.map((box) => (
                                <span
                                  key={box.boxId}
                                  className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-white border border-slate-200 px-2 text-[11px] font-medium text-slate-600"
                                >
                                  {box.boxNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Locations */}
        {activeTab === "locations" && (
          <>
            {locations.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-10 text-center text-sm text-slate-400">
                  <MapPin size={32} className="mx-auto mb-2 text-slate-200" />
                  Este producto no tiene ubicaciones asignadas.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <Card key={loc.positionId} className="border-0 shadow-sm">
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <MapPin size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">{loc.positionCode}</p>
                            {loc.isPrimary && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">Principal</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{loc.path}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Stock: <strong className="text-slate-800">{loc.theoreticalStock}</strong>
                            {loc.minimumStock != null && (
                              <span className="text-slate-400"> · Mín: {loc.minimumStock}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link href={`/products/${id}/locations`} className="flex-1">
            <Card className="border-0 shadow-sm cursor-pointer hover:border-teal-200 hover:shadow-md transition-all">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Gestionar ubicaciones</p>
                  <p className="text-[11px] text-slate-400">Asignar o quitar posiciones</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/products/${id}/label`} className="flex-1">
            <Card className="border-0 shadow-sm cursor-pointer hover:border-teal-200 hover:shadow-md transition-all">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Tag size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Etiqueta</p>
                  <p className="text-[11px] text-slate-400">Imprimir etiqueta</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
