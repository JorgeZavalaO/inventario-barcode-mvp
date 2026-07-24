"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProductImportRow = {
  code: string;
  barcode?: string;
  description: string;
  unit?: string;
  category?: string;
  supplierCode?: string;
  theoreticalStock?: number;
  importCode?: string;
  palletNumber?: string;
  boxNumber?: string;
  expectedQty?: number;
};

export type ProductImportValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    rows: number;
    newProducts: number;
    existingProducts: number;
    newImports: number;
    newPallets: number;
    newBoxes: number;
    newLinks: number;
    existingLinks: number;
  };
};

export function ImportPreview({
  validation,
  onCancel,
  onConfirm,
}: {
  validation: ProductImportValidation;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { summary } = validation;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold">Validación previa de carga</h2>
          <p className="mt-1 text-sm text-slate-500">Todavía no se ha modificado la base de datos.</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-2 py-3"><p className="text-lg font-bold">{summary.rows}</p><p className="text-xs text-slate-500">Filas</p></div>
            <div className="rounded-lg bg-slate-50 px-2 py-3"><p className="text-lg font-bold">{summary.newProducts}</p><p className="text-xs text-slate-500">Productos nuevos</p></div>
            <div className="rounded-lg bg-slate-50 px-2 py-3"><p className="text-lg font-bold">{summary.newBoxes}</p><p className="text-xs text-slate-500">Cajas nuevas</p></div>
            <div className="rounded-lg bg-slate-50 px-2 py-3"><p className="text-lg font-bold">{summary.newLinks}</p><p className="text-xs text-slate-500">Relaciones nuevas</p></div>
          </div>

          {validation.valid ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
              <span>La carga no tiene conflictos bloqueantes y está lista para confirmar.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="mt-0.5 shrink-0" size={16} />
              <span>Corrige los conflictos antes de cargar el archivo.</span>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={16} /> Advertencias ({validation.warnings.length})</p>
              <div className="max-h-36 space-y-1 overflow-y-auto text-xs text-amber-800">
                {validation.warnings.slice(0, 50).map((warning, index) => <p key={index}>{warning}</p>)}
              </div>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="mb-2 text-sm font-semibold text-red-800">Conflictos ({validation.errors.length})</p>
              <div className="max-h-48 space-y-1 overflow-y-auto text-xs text-red-800">
                {validation.errors.slice(0, 100).map((error, index) => <p key={index}>{error}</p>)}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={onConfirm} disabled={!validation.valid}>Confirmar carga</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
