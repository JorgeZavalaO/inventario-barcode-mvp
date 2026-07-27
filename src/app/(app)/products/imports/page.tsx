"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  LoaderCircle,
  Building2,
  Package,
  Boxes,
  ChevronDown,
  ChevronRight,
  Search,
  PackagePlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Product = {
  productId: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  expectedQty: number | null;
  supplierCode: string | null;
};

type Box = {
  id: string;
  number: string;
  products: Product[];
};

type Pallet = {
  id: string;
  number: string;
  boxes: Box[];
};

type Import = {
  id: string;
  code: string;
  description: string | null;
  createdAt: string;
  totalPallets: number;
  totalBoxes: number;
  totalProducts: number;
  pallets: Pallet[];
};

export default function ImportsPage() {
  const [imports, setImports] = useState<Import[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedImports, setExpandedImports] = useState<Set<string>>(new Set());
  const [expandedPallets, setExpandedPallets] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ imports: Import[] }>("/api/imports");
      setImports(data.imports);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleImport(id: string) {
    setExpandedImports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePallet(id: string) {
    setExpandedPallets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedImports(new Set(imports.map((i) => i.id)));
    setExpandedPallets(new Set(imports.flatMap((i) => i.pallets.map((p) => p.id))));
  }

  function collapseAll() {
    setExpandedImports(new Set());
    setExpandedPallets(new Set());
  }

  const filtered = imports.filter((imp) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      imp.code.toLowerCase().includes(term) ||
      imp.description?.toLowerCase().includes(term) ||
      imp.pallets.some((p) => p.number.toLowerCase().includes(term))
    );
  });

  const totalPallets = imports.reduce((s, i) => s + i.totalPallets, 0);
  const totalBoxes = imports.reduce((s, i) => s + i.totalBoxes, 0);
  const totalProducts = imports.reduce((s, i) => s + i.totalProducts, 0);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/products" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold tracking-tight">Importaciones</h1>
            <p className="text-[11px] text-slate-400">Importación → Pallet → Cajas → Productos</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 p-4 pb-8">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Building2 size={16} className="text-blue-600" />
                <p className="text-xl font-bold text-blue-700">{imports.length}</p>
              </div>
              <p className="text-[11px] text-slate-500">Importaciones</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Package size={16} className="text-purple-600" />
                <p className="text-xl font-bold text-purple-700">{totalPallets}</p>
              </div>
              <p className="text-[11px] text-slate-500">Pallets</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Boxes size={16} className="text-teal-600" />
                <p className="text-xl font-bold text-teal-700">{totalBoxes}</p>
              </div>
              <p className="text-[11px] text-slate-500">Cajas</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar importación, pallet..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>
          <Button variant="outline" size="sm" className="h-11 rounded-xl px-3" onClick={expandAll}>
            Expandir
          </Button>
          <Button variant="ghost" size="sm" className="h-11 rounded-xl px-3" onClick={collapseAll}>
            Colapsar
          </Button>
        </div>

        {/* Import list */}
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-400">
              <Building2 size={32} className="mx-auto mb-2 text-slate-200" />
              {search ? "No se encontraron importaciones." : "No hay importaciones creadas."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((imp) => {
              const isExpanded = expandedImports.has(imp.id);
              return (
                <Card key={imp.id} className="border-0 shadow-sm overflow-visible">
                  <CardContent className="p-0">
                    {/* Import header */}
                    <button
                      onClick={() => toggleImport(imp.id)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0 text-slate-400" />
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Building2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{imp.code}</p>
                        {imp.description && imp.description !== imp.code && (
                          <p className="text-[11px] text-slate-400 truncate">{imp.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[11px]">
                          {imp.totalPallets} pallet{imp.totalPallets !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {imp.totalBoxes} caja{imp.totalBoxes !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </button>

                    {/* Pallets (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 pb-4 space-y-2 pt-3">
                        {imp.pallets.map((pal) => {
                          const isPalletExpanded = expandedPallets.has(pal.id);
                          return (
                            <div key={pal.id} className="rounded-lg bg-slate-50 border border-slate-100">
                              <button
                                onClick={() => togglePallet(pal.id)}
                                className="flex w-full items-center gap-2.5 p-3 text-left"
                              >
                                {isPalletExpanded ? (
                                  <ChevronDown size={14} className="shrink-0 text-slate-400" />
                                ) : (
                                  <ChevronRight size={14} className="shrink-0 text-slate-400" />
                                )}
                                <Package size={14} className="shrink-0 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700">{pal.number}</span>
                                <span className="text-[11px] text-slate-400">
                                  · {pal.boxes.length} caja{pal.boxes.length !== 1 ? "s" : ""}
                                </span>
                              </button>

                              {/* Boxes (expanded) */}
                              {isPalletExpanded && (
                                <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                                  <div className="space-y-1.5">
                                    {pal.boxes.map((box) => (
                                      <div key={box.id} className="rounded-md bg-white border border-slate-200 p-2.5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <Boxes size={12} className="text-teal-500" />
                                          <span className="text-[11px] font-bold text-slate-700">Caja {box.number}</span>
                                          {box.products.length > 0 && (
                                            <span className="text-[11px] text-slate-400">
                                              · {box.products.length} producto{box.products.length !== 1 ? "s" : ""}
                                            </span>
                                          )}
                                        </div>
                                        {box.products.length > 0 && (
                                          <div className="space-y-1 ml-5">
                                            {box.products.map((prod) => (
                                              <div key={prod.productId} className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-600 truncate">
                                                  {prod.productDescription}
                                                  <span className="text-slate-400 ml-1">{prod.productCode}</span>
                                                </span>
                                                {prod.expectedQty != null && (
                                                  <span className="shrink-0 ml-2 text-slate-500">
                                                    {prod.expectedQty} {prod.productUnit}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {box.products.length === 0 && (
                                          <p className="text-[11px] text-slate-400 ml-5">Sin productos asociados</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
