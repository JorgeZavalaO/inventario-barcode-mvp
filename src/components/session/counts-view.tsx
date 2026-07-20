"use client";

import { Search, Boxes, LoaderCircle, Barcode } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import type { SessionProduct } from "@/lib/types";

function formatNumber(value: number) {
  return Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 });
}

function differenceStyle(value: number) {
  if (value === 0) return "bg-emerald-50 text-emerald-700";
  if (value > 0) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function CountsView({
  products,
  loading,
}: {
  products: SessionProduct[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.code, product.barcode ?? "", product.description, product.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 p-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="max-h-[38rem] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Teórico</TableHead>
              <TableHead>Físico</TableHead>
              <TableHead>Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-slate-500">
                  <LoaderCircle className="mx-auto mb-2 animate-spin" size={24} /> Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <p className="font-semibold text-slate-900">{product.description}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {product.code} · {product.barcode || "—"}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatNumber(product.theoretical_stock)} <span className="text-xs text-slate-400">{product.unit}</span>
                </TableCell>
                <TableCell className="tabular-nums font-bold">{formatNumber(product.counted)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 font-mono text-xs font-bold ${
                      product.counted === 0
                        ? "bg-slate-100 text-slate-500"
                        : differenceStyle(product.difference)
                    }`}
                  >
                    {product.counted === 0
                      ? "—"
                      : `${product.difference > 0 ? "+" : ""}${formatNumber(product.difference)}`}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !filtered.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-14 text-center text-sm text-slate-500">
                  <Boxes className="mx-auto mb-2 text-slate-300" size={30} />
                  {search ? "No se encontraron productos." : "No hay productos en esta sesión."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
