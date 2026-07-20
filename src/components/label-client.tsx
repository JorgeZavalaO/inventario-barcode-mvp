"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { BarcodeLabel } from "@/components/barcode-label";
import { apiFetch } from "@/lib/client";
import type { Product } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LabelClient({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ product: Product }>(`/api/products/${productId}`)
      .then((data) => setProduct(data.product))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar"));
  }, [productId]);

  if (!product && !error) {
    return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin text-teal-700" size={34} /></div>;
  }

  if (!product) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="font-bold">{error}</p>
        <Button variant="outline" className="mt-4" render={<Link href="/" />}>
          Volver
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" render={<Link href="/" />}>
          <ArrowLeft size={16} /> Catálogo
        </Button>
        <Button onClick={() => window.print()}>
          <Printer size={18} /> Imprimir etiqueta
        </Button>
      </div>
      <CardContent className="print:border-0 print:shadow-none">
        <div className="mx-auto max-w-xl">
          <BarcodeLabel value={product.barcode} description={product.description} code={product.code} />
          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <p><span className="block text-xs text-slate-500">Unidad</span><strong>{product.unit}</strong></p>
            <p><span className="block text-xs text-slate-500">Categoría</span><strong>{product.category || "Sin categoría"}</strong></p>
            <p><span className="block text-xs text-slate-500">Stock teórico</span><strong>{product.theoretical_stock.toLocaleString("es-PE")}</strong></p>
            <p><span className="block text-xs text-slate-500">Formato</span><strong>Code 128</strong></p>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
