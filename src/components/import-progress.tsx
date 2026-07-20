"use client";

import { CheckCircle2, XCircle, AlertTriangle, LoaderCircle, X, FileSpreadsheet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";

type ImportResult = {
  imported: number;
  errors: string[];
};

const BATCH_SIZE = 200;

export function ImportProgress({
  products,
  onClose,
  onComplete,
}: {
  products: { code: string; barcode?: string; description: string; unit?: string; category?: string; theoreticalStock?: number }[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"importing" | "done" | "error">("importing");
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [abort, setAbort] = useState(false);

  const total = products.length;
  const totalBatches = Math.ceil(total / BATCH_SIZE);

  const run = useCallback(async () => {
    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (abort) return;
      const batch = products.slice(i, i + BATCH_SIZE);
      try {
        const result = await apiFetch<ImportResult>("/api/products/import", {
          method: "POST",
          body: JSON.stringify({ products: batch }),
        });
        setImported((prev) => prev + result.imported);
        if (result.errors.length) {
          setErrors((prev) => [...prev, ...result.errors]);
        }
      } catch (cause) {
        setErrors((prev) => [
          ...prev,
          `Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${cause instanceof Error ? cause.message : "Error"}`,
        ]);
      }
      setProgress(Math.min(i + BATCH_SIZE, total));
    }
    setStatus("done");
    onComplete();
  }, [products, abort, onComplete]);

  useEffect(() => {
    run();
  }, [run]);

  function handleCancel() {
    setAbort(true);
    setStatus("done");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-teal-600" />
            <h2 className="font-bold text-lg">
              {status === "importing" ? "Importando productos" : "Importación completada"}
            </h2>
          </div>
          {status !== "importing" && (
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {status === "importing" && (
            <>
              <div className="flex items-center gap-3">
                <LoaderCircle className="animate-spin text-teal-600 shrink-0" size={22} />
                <div className="text-sm text-slate-600">
                  Procesando <strong>{Math.min(progress, total)}</strong> de <strong>{total}</strong> productos
                  {totalBatches > 1 && (
                    <span className="text-slate-400">
                      {" "}· Lote {Math.ceil(progress / BATCH_SIZE)} de {totalBatches}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
                />
              </div>

              {imported > 0 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> {imported} producto{imported !== 1 ? "s" : ""} importado{imported !== 1 ? "s" : ""} hasta ahora
                </p>
              )}

              {errors.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-800">{errors.length} error{errors.length !== 1 ? "es" : ""} detectado{errors.length !== 1 ? "s" : ""}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </>
          )}

          {status === "done" && (
            <>
              <div className="flex items-start gap-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  errors.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {errors.length === 0 ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                </span>
                <div>
                  <p className="font-bold text-lg">{imported} producto{imported !== 1 ? "s" : ""} importado{imported !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-slate-500">de un total de {total} fila{total !== 1 ? "s" : ""} en el archivo.</p>
                </div>
              </div>

              {!abort && errors.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Todos los productos se importaron correctamente.
                </div>
              )}

              {abort && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                  <AlertTriangle size={16} /> Importación cancelada. Algunos productos no se procesaron.
                </div>
              )}

              {errors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <XCircle size={15} /> {errors.length} error{errors.length !== 1 ? "es" : ""}
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3 space-y-1">
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-700 font-mono leading-relaxed">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={onClose}>Cerrar</Button>
              </div>
            </>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <XCircle className="mx-auto mb-3 text-red-500" size={38} />
              <p className="font-bold">Error durante la importación</p>
              <p className="text-sm text-slate-500 mt-1">{errors[errors.length - 1]}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
