"use client";

import { ArrowRight, Layers3 } from "lucide-react";
import type { DesignerCompartment } from "@/components/locations/interactive-rack-designer";

type Props = {
  selected: DesignerCompartment | null;
  selectedDepth: number;
  onSelectDepth: (index: number) => void;
};

const fallbackSlot = { id: "fallback-depth", code: "P01", name: "Única" };

export function RackDepthPreview({ selected, selectedDepth, onSelectDepth }: Props) {
  const slots = selected?.depthSlots?.length ? selected.depthSlots : [fallbackSlot];
  const activeDepth = Math.min(selectedDepth, slots.length - 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="rack-depth-preview-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 className="size-4 text-teal-700" aria-hidden="true" />
            <h3 id="rack-depth-preview-title" className="text-sm font-semibold text-slate-800">Vista lateral</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Representación de frente hacia fondo.</p>
        </div>
        {selected && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500">{slots.length} profundidad{slots.length === 1 ? "" : "es"}</span>}
      </div>

      {!selected ? (
        <div className="mt-4 flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-xs text-slate-500">
          Selecciona un compartimento en la vista frontal para revisar su profundidad.
        </div>
      ) : (
        <>
          <div className="relative mt-5 rounded-lg border border-slate-300 bg-white p-3 pt-5">
            <div className="absolute left-3 right-3 top-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <span>Frente</span>
              <ArrowRight className="size-3" aria-hidden="true" />
              <span>Fondo</span>
            </div>
            <div className="flex min-h-36 items-stretch gap-1.5" role="group" aria-label={`Profundidades de ${selected.code}`}>
              {slots.map((slot, index) => {
                const isActive = activeDepth === index;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={`Seleccionar profundidad ${slot.name} (${slot.code})`}
                    aria-pressed={isActive}
                    onClick={() => onSelectDepth(index)}
                    className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-md border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-500/40 ${isActive ? "border-teal-600 bg-teal-100 text-teal-900 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50"}`}
                  >
                    <span className="text-xs font-semibold">{slot.name}</span>
                    <span className="mt-1 text-[10px] text-slate-500">{slot.code}</span>
                    {isActive && <span className="mt-2 rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Activa</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-white px-2.5 py-2">
              <dt className="text-slate-400">Compartimento</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-700">{selected.code} · {selected.name}</dd>
            </div>
            <div className="rounded-md bg-white px-2.5 py-2">
              <dt className="text-slate-400">Matriz física</dt>
              <dd className="mt-0.5 font-medium text-slate-700">{selected.columnCount ?? 1} × {selected.stackLevels ?? 1} × {slots.length}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
