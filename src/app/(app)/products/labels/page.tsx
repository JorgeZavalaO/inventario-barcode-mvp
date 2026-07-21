"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle, Printer, Info } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarcodeLabel, type LabelFormat } from "@/components/barcode-label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";
import type { Product } from "@/lib/types";

const LABEL_SIZES = [
  { id: "100x75", label: "100 × 75 mm", width: 100, height: 75 },
  { id: "100x50", label: "100 × 50 mm", width: 100, height: 50 },
  { id: "75x50", label: "75 × 50 mm", width: 75, height: 50 },
  { id: "75x25", label: "75 × 25 mm", width: 75, height: 25 },
  { id: "50x25", label: "50 × 25 mm", width: 50, height: 25 },
];

const FORMAT_OPTIONS: { id: LabelFormat; label: string }[] = [
  { id: "CODE128", label: "Código de barras" },
  { id: "QR", label: "Código QR" },
];

export default function LabelsPage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelSize, setLabelSize] = useState("100x50");
  const [customW, setCustomW] = useState("100");
  const [customH, setCustomH] = useState("50");
  const [format, setFormat] = useState<LabelFormat>(() => {
    if (typeof window === "undefined") return "CODE128";
    return (
      (localStorage.getItem("labelFormat") as LabelFormat) ||
      (localStorage.getItem("defaultLabelFormat") as LabelFormat) ||
      "CODE128"
    );
  });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    localStorage.setItem("labelFormat", format);
  }, [format]);

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

  const size = useMemo(() => {
    if (labelSize === "custom") {
      return { width: Math.max(20, Number(customW) || 100), height: Math.max(10, Number(customH) || 50) };
    }
    return LABEL_SIZES.find((s) => s.id === labelSize) ?? LABEL_SIZES[1];
  }, [labelSize, customW, customH]);

  const showQrWarning = format === "CODE128" && size.height < 40;

  return (
    <div>
      <div className="mb-5 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/products" />}>
            <ArrowLeft size={16} /> Productos
          </Button>
          <p className="text-sm text-slate-500">
            {loading ? "Cargando..." : `${products.length} etiqueta${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Printer size={16} />
            <span>Tamaño etiqueta:</span>
          </div>
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value)}
          >
            {LABEL_SIZES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
          {labelSize === "custom" && (
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number"
                min="20"
                max="300"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="h-8 w-16 rounded-md border border-slate-200 px-2 text-center font-mono text-sm"
              />
              <span>×</span>
              <input
                type="number"
                min="10"
                max="300"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="h-8 w-16 rounded-md border border-slate-200 px-2 text-center font-mono text-sm"
              />
              <span className="text-slate-400">mm</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-600 ml-4">
            <span>Formato:</span>
          </div>
          <div className="flex rounded-md border border-slate-200 bg-white text-sm" role="radiogroup">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                role="radio"
                aria-checked={format === opt.id}
                className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  format === opt.id
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setFormat(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}>
              <Info size={16} /> Ayuda
            </Button>
            <Button size="sm" onClick={() => window.print()} disabled={loading}>
              <Printer size={16} /> Imprimir
            </Button>
          </div>
        </div>

        {showQrWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>
              El tamaño de etiqueta es muy pequeño para código de barras. Se recomienda usar <strong>Código QR</strong> para mejor lectura con cámara.
            </span>
          </div>
        )}

        {showHelp && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 space-y-2">
            <p className="font-semibold">Configuración para TSC TE200</p>
            <ol className="list-decimal ml-5 space-y-1 text-teal-700">
              <li>En el diálogo de impresión, seleccioná <strong>TSC TE200</strong> como impresora.</li>
              <li>Andá a <strong>Propiedades de la impresora</strong> → <strong>Opciones avanzadas</strong> o <strong>Page Setup</strong>.</li>
              <li>Configurá el tamaño de página: <strong>{size.width} × {size.height} mm</strong>.</li>
              <li>En <strong>Tipo de papel</strong>: seleccioná <strong>Etiqueta / Label</strong> o <strong>Transferencia térmica</strong>.</li>
              <li>Velocidad de impresión recomendada: <strong>4–6 ips</strong>.</li>
              <li>Asegurate de que la etiqueta esté correctamente cargada y centrada.</li>
              <li>Hacé click en <strong>Imprimir</strong>.</li>
            </ol>
            <p className="text-xs text-teal-600 mt-2">
              Si el diálogo de impresión no muestra las opciones, usá el controlador <strong>Microsoft XPS Document Writer</strong> primero para previsualizar, luego imprimí con la TSC.
            </p>
          </div>
        )}
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
        <div className="flex flex-col items-center gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="label-item w-full max-w-xs">
              <BarcodeLabel
                value={product.barcode || product.code}
                description={product.description}
                code={product.code}
                compact={size.height < 40}
                format={format}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page {
            size: ${size.width}mm ${size.height}mm;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label-item {
            page-break-after: always;
            page-break-inside: avoid;
            width: 100%;
            max-width: none;
          }
          .label-item:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
