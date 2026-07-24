"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineStore } from "@/lib/offline-store";
import { Database, LoaderCircle, CheckCircle2, WifiOff } from "lucide-react";

type SyncStage = {
  label: string;
  weight: number;
};

const STAGES: SyncStage[] = [
  { label: "Productos", weight: 40 },
  { label: "Importaciones", weight: 10 },
  { label: "Pallets", weight: 10 },
  { label: "Cajas", weight: 20 },
  { label: "Productos de caja", weight: 20 },
];

export function OfflineDataLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("Verificando datos...");
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const hasCachedOfflineData = useCallback(async () => {
    try {
      const meta = await offlineStore.getSyncMeta("full-sync");
      const operators = await offlineStore.getAll("operators");
      if (meta && meta.count > 0 && (operators.length > 0 || !navigator.onLine)) {
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, []);

  const downloadData = useCallback(async () => {
    setIsOnline(navigator.onLine);
    const hasData = await hasCachedOfflineData();

    if (!navigator.onLine) {
      if (hasData) {
        setError(null);
        setLoading(false);
      } else {
        setError("Sin conexión y sin datos offline. Conéctese a internet para descargar datos.");
        setLoading(false);
      }
      return;
    }

    try {
      setError(null);
      setCurrentStage("Descargando datos del servidor...");
      setProgress(5);

      const resp = await fetch("/api/offline/sync", { credentials: "include" });
      if (!resp.ok) throw new Error("Error al descargar datos");
      const data = await resp.json();
      const operators = data.operators ?? [];

      setProgress(10);
      setCurrentStage(`Procesando ${data.products.length} productos...`);

      await new Promise((r) => setTimeout(r, 100));
      await offlineStore.replaceAll("products", data.products);
      setProgress(10 + STAGES[0].weight);
      setCurrentStage(`${data.products.length} productos guardados`);

      await new Promise((r) => setTimeout(r, 50));
      setCurrentStage(`Procesando ${data.imports.length} importaciones...`);
      await offlineStore.replaceAll("imports", data.imports);
      setProgress(10 + STAGES[0].weight + STAGES[1].weight);

      await new Promise((r) => setTimeout(r, 50));
      setCurrentStage(`Procesando ${data.pallets.length} pallets...`);
      await offlineStore.replaceAll("pallets", data.pallets);
      setProgress(10 + STAGES[0].weight + STAGES[1].weight + STAGES[2].weight);

      await new Promise((r) => setTimeout(r, 50));
      setCurrentStage(`Procesando ${data.boxes.length} cajas...`);
      await offlineStore.replaceAll("boxes", data.boxes);
      setProgress(10 + STAGES[0].weight + STAGES[1].weight + STAGES[2].weight + STAGES[3].weight);

      await new Promise((r) => setTimeout(r, 50));
      setCurrentStage(`Procesando ${data.boxProducts.length} productos de caja...`);
      await offlineStore.replaceAll("boxProducts", data.boxProducts);

      setCurrentStage(`Procesando ${operators.length} operarios...`);
      await offlineStore.replaceAll("operators", operators);

      const totalItems = data.products.length + data.imports.length + data.pallets.length + data.boxes.length + data.boxProducts.length + operators.length;
      await offlineStore.updateSyncMeta("full-sync", totalItems);

      setProgress(100);
      setCurrentStage("Datos descargados correctamente");

      await new Promise((r) => setTimeout(r, 500));
      setLoading(false);
      window.dispatchEvent(new CustomEvent("offline-data-synced"));
    } catch (err) {
      if (hasData) {
        setError(null);
        setCurrentStage("Usando datos offline guardados");
      } else {
        setError(err instanceof Error ? err.message : "Error al descargar datos");
      }
      setLoading(false);
    }
  }, [hasCachedOfflineData]);

  useEffect(() => {
    void downloadData();
  }, [downloadData]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm px-6 space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20">
            <Database className="h-8 w-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">StockScan</h1>
            <p className="text-sm text-slate-400 mt-1">Preparando datos para uso offline</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{currentStage}</span>
              <span className="font-mono text-teal-400 font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            {progress < 100 ? (
              <>
                <LoaderCircle className="animate-spin" size={14} />
                <span>Descargando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Listo</span>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
              {!isOnline && <WifiOff size={16} className="mx-auto mb-2 text-red-400" />}
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setProgress(0);
                  void downloadData();
                }}
                className="mt-2 text-xs text-red-400 underline hover:text-red-300"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          Los datos se almacenan localmente para funcionar sin internet
        </p>
      </div>
    </div>
  );
}
