"use client";

import { useEffect, useState, useCallback } from "react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { useOfflineData } from "@/hooks/use-offline-data";
import {
  WifiOff,
  LoaderCircle,
  RefreshCw,
  X,
  Trash2,
  Database,
  Cloud,
  CloudOff,
  AlertTriangle,
  CheckCircle2,
  Package,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTimeLima, formatTimeLima } from "@/lib/date-time";

export function OfflineBanner() {
  const queue = useOfflineQueue();
  const data = useOfflineData();
  const [open, setOpen] = useState(false);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [dataToast, setDataToast] = useState("");

  const isOnline = queue.isOnline;
  const pendingCount = queue.pendingCount;
  const syncedCount = queue.syncedCount;
  const syncQueue = queue.sync;
  const errorCount = queue.items.filter((i) => i.status === "ERROR").length;
  const syncingCount = queue.items.filter((i) => i.status === "SYNCING").length;
  const [queueToast, setQueueToast] = useState("");

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const t = setTimeout(() => {
        setSyncingQueue(true);
        void syncQueue().finally(() => setSyncingQueue(false));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isOnline, pendingCount, syncQueue]);

  async function handleSyncQueue() {
    setSyncingQueue(true);
    setQueueToast("");
    try {
      await queue.sync(true);
      setQueueToast("Sincronización ejecutada");
      setTimeout(() => setQueueToast(""), 3000);
    } finally {
      setSyncingQueue(false);
    }
  }

  async function handleClearSynced() {
    const removed = await queue.clearSynced();
    setQueueToast(
      removed > 0
        ? `${removed} conteo${removed === 1 ? "" : "s"} sincronizado${removed === 1 ? "" : "s"} eliminado${removed === 1 ? "" : "s"}`
        : "No hay conteos sincronizados para limpiar",
    );
    setTimeout(() => setQueueToast(""), 3000);
  }

  async function handleSyncData() {
    setSyncingData(true);
    setDataToast("");
    try {
      await data.syncData();
      setDataToast("Datos descargados correctamente");
      setTimeout(() => setDataToast(""), 3000);
    } catch {
      setDataToast("Error al descargar datos");
    } finally {
      setSyncingData(false);
    }
  }

  const hasData = data.counts.products > 0;
  const showButton = pendingCount > 0 || !isOnline || true;

  if (!showButton) return null;

  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6">
        {open && (
          <div className="w-80 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className={`flex items-center justify-between px-4 py-3 ${isOnline ? "bg-emerald-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Cloud size={16} className="text-emerald-600" />
                ) : (
                  <CloudOff size={16} className="text-red-600" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {isOnline ? "Conectado" : "Sin conexión"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isOnline
                      ? "Puedes sincronizar datos para uso offline"
                      : "Usando datos cacheados localmente"}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-black/5">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Datos offline</p>
                  {data.lastSync && (
                    <p className="text-xs text-slate-400">
                      {formatDateTimeLima(data.lastSync)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-800">{data.counts.products}</p>
                    <p className="text-xs text-slate-500">Productos</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-slate-800">{data.counts.boxes}</p>
                    <p className="text-xs text-slate-500">Cajas</p>
                  </div>
                </div>

                {dataToast && (
                  <p className={`rounded px-2 py-1 text-xs ${dataToast.includes("Error") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {dataToast}
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full h-9"
                  onClick={() => void handleSyncData()}
                  disabled={syncingData || !isOnline}
                >
                  {syncingData ? (
                    <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Database size={14} className="mr-1.5" />
                  )}
                  {hasData ? "Actualizar datos offline" : "Descargar datos para offline"}
                </Button>
              </div>

              {pendingCount > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cola de sincronización</p>
                  <div className="space-y-1">
                    {queue.items
                      .filter((i) => i.status !== "SYNCED")
                      .slice(0, 5)
                      .map((item) => {
                        let body: any = {};
                        try { body = JSON.parse(item.body); } catch { /* silent */ }
                        const label = body?.boxIdentity
                          ? `${body.boxIdentity.importCode} / ${body.boxIdentity.boxNumber}`
                          : item.endpoint.split("/").slice(-2).join("/");

                        return (
                          <div key={item.id} className="flex items-center gap-2 text-xs">
                            {item.status === "PENDING" && <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />}
                            {item.status === "SYNCING" && <LoaderCircle size={12} className="animate-spin text-blue-500 shrink-0" />}
                            {item.status === "ERROR" && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                            <span className="flex-1 truncate text-slate-600">{label}</span>
                            <span className="text-slate-400">
                              {formatTimeLima(item.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {isOnline && pendingCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-9"
                      onClick={() => void handleSyncQueue()}
                      disabled={syncingQueue}
                    >
                      {syncingQueue ? (
                        <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw size={14} className="mr-1.5" />
                      )}
                      Sincronizar conteos ({pendingCount})
                    </Button>
                  )}
                  {!isOnline && pendingCount > 0 && (
                    <p className="text-xs text-slate-400">
                      Los conteos quedan guardados y se sincronizarán al recuperar la conexión.
                    </p>
                  )}
                </div>
              )}

              {queueToast && (
                <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{queueToast}</p>
              )}

              <div className="border-t border-slate-100 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-8 text-xs text-slate-400"
                  onClick={() => void handleClearSynced()}
                  disabled={syncedCount === 0}
                >
                  <Trash2 size={12} className="mr-1" /> Limpiar sincronizados ({syncedCount})
                </Button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
            !isOnline
              ? "bg-red-500 text-white"
              : pendingCount > 0
                ? "bg-amber-500 text-white"
                : hasData
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-400 text-white"
          }`}
        >
          {!isOnline ? (
            <CloudOff size={24} />
          ) : syncingCount > 0 || syncingData ? (
            <LoaderCircle size={24} className="animate-spin" />
          ) : (
            <HardDrive size={24} />
          )}
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-1 text-xs font-bold shadow-sm ring-2 ring-current">
              <span className={!isOnline ? "text-red-600" : errorCount > 0 ? "text-red-600" : "text-amber-600"}>
                {pendingCount}
              </span>
            </span>
          )}
          {hasData && pendingCount === 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
              <CheckCircle2 size={12} className="text-emerald-500" />
            </span>
          )}
        </button>
      </div>

      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs text-white">
          <WifiOff size={14} />
          <span className="font-medium">Sin conexión a internet</span>
          <span className="opacity-80">— modo offline activo</span>
        </div>
      )}
    </>
  );
}
