"use client";

import { RotateCcw, ScanBarcode } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CountEvent } from "@/lib/types";

function formatNumber(value: number) {
  return Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
    new Date(value),
  );
}

export function ActivityView({
  events,
  isOpen,
  operatorId,
  onReverse,
  sending,
}: {
  events: CountEvent[];
  isOpen: boolean;
  operatorId?: string;
  onReverse: (eventId: string) => void;
  sending: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-200 p-5">
        <div>
          <h2 className="font-bold">Últimos movimientos</h2>
          <p className="text-sm text-slate-500">Bitácora auditable de lecturas y anulaciones.</p>
        </div>
        <ScanBarcode className="text-slate-400" size={21} />
      </div>
      <div className="divide-y divide-slate-100">
        {events.slice(0, 50).map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 p-4 ${event.reversed_at ? "opacity-45" : ""}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-sm font-bold text-slate-700">
              +{formatNumber(event.quantity)}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${event.reversed_at ? "line-through" : ""}`}>
                {event.product_description}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {event.operator_name} · {event.input_method.toLowerCase()} · {formatTime(event.created_at)}
              </p>
            </div>
            {!event.reversed_at && isOpen && event.operator_id === operatorId && (
              <button
                type="button"
                onClick={() => onReverse(event.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Anular"
                disabled={sending}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        ))}
        {!events.length && (
          <div className="p-8 text-center text-sm text-slate-500">Todavía no hay movimientos.</div>
        )}
      </div>
    </Card>
  );
}
