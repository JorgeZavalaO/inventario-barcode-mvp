"use client";

import { useEffect } from "react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { Wifi, WifiOff, LoaderCircle, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { items, isOnline, pendingCount, sync, clearSynced } = useOfflineQueue();

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const t = setTimeout(() => void sync(), 1000);
      return () => clearTimeout(t);
    }
  }, [isOnline, pendingCount, sync]);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs ${isOnline ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
      {isOnline ? (
        <Wifi size={12} className="text-amber-500" />
      ) : (
        <WifiOff size={12} className="text-red-500" />
      )}
      <span className="flex-1">
        {isOnline
          ? `${pendingCount} operacione${pendingCount === 1 ? "n" : "nes"} pendiente${pendingCount === 1 ? "" : "s"} de sincronizar`
          : "Sin conexión — los conteos se guardarán localmente"}
      </span>
      {isOnline && pendingCount > 0 && (
        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs" onClick={() => void sync()}>
          <LoaderCircle size={10} className="mr-1 animate-spin" /> Sincronizar
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs" onClick={() => void clearSynced()}>
        <X size={10} /> Limpiar
      </Button>
    </div>
  );
}
