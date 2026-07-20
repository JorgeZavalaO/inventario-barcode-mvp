"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BarcodeLabel } from "@/components/barcode-label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";
import type { Product } from "@/lib/types";

export default function LabelsPage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const url = ids ? `/api/products?ids=${encodeURIComponent(ids)}` : "/api/products";
      const data = await apiFetch<{ products: Product[] }>(url);
      setProducts(data.products);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => { window.setTimeout(() => void fetchAll(), 0); }, [fetchAll]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/products" />}>
          <ArrowLeft size={16} /> Productos
        </Button>
        <p className="text-sm text-slate-500">
          {loading ? "Cargando..." : `${products.length} etiqueta${products.length !== 1 ? "s" : ""}`}
        </p>
        <Button onClick={() => window.print()} disabled={loading}>
          <Printer size={18} /> Imprimir
        </Button>
      </div>

      {loading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <LoaderCircle className="animate-spin text-teal-700" size={34} />
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <p className="font-semibold">No hay productos para mostrar</p>
          <Button variant="outline" size="sm" className="mt-4" nativeButton={false} render={<Link href="/products" />}>
            Volver a productos
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => (
            <BarcodeLabel
              key={product.id}
              value={product.barcode || product.code}
              description={product.description}
              code={product.code}
              compact
            />
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5cm; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
