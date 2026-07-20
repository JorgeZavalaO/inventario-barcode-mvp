"use client";

import Link from "next/link";
import { ScanBarcode } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { InventorySession } from "@/lib/types";

export function SessionPickerSheet({
  sessions,
  open,
  onOpenChange,
}: {
  sessions: InventorySession[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const openSessions = sessions.filter((s) => s.status === "OPEN");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Selecciona una sesión</SheetTitle>
          <SheetDescription>
            Hay {openSessions.length} sesiones activas. Elegí a cuál ingresar para escanear.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {openSessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}/scan`}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 hover:bg-teal-50/30"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <ScanBarcode size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                <p className="text-xs text-slate-500">
                  {s.warehouse} · {s.counted_products ?? 0}/{s.product_count ?? 0} productos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
