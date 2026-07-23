"use client";

import { type Rect } from "@/lib/rack-validation";

export type DesignerCompartment = {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnCount?: number;
  stackLevels?: number;
  moduleLabel?: string | null;
  levelLabel?: string | null;
  depthSlots?: { id: string; code: string; name: string }[];
};

type Props = {
  compartments: DesignerCompartment[];
  rackWidth: number;
  rackHeight: number;
  selectedId: string | null;
  selectedCell?: { compartmentId: string; columnIndex: number; stackIndex: number } | null;
  selectedDepthIndex?: number;
  onSelect: (id: string | null) => void;
  onCellSelect?: (cell: { compartmentId: string; columnIndex: number; stackIndex: number }) => void;
};

function asRect(compartment: DesignerCompartment): Rect {
  return { x: compartment.x, y: compartment.y, width: compartment.width, height: compartment.height };
}

export function InteractiveRackDesigner({
  compartments,
  rackWidth,
  rackHeight,
  selectedId,
  selectedCell = null,
  onSelect,
  onCellSelect,
}: Props) {

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <svg
        viewBox={`0 0 ${rackWidth} ${rackHeight}`}
        className="block h-auto min-h-[200px] w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Vista frontal del rack"
      >
        <rect width={rackWidth} height={rackHeight} fill="#f8fafc" />
        <rect x={0} y={0} width={rackWidth} height={rackHeight} fill="none" stroke="#94a3b8" strokeWidth={12} vectorEffect="non-scaling-stroke" pointerEvents="none" />

        {compartments.map((compartment) => {
          const rect = asRect(compartment);
          const isSelected = selectedId === compartment.id;
          const hasDepth = (compartment.depthSlots?.length ?? 0) > 0;
          const cols = Math.max(compartment.columnCount ?? 1, 1);
          const stacks = Math.max(compartment.stackLevels ?? 1, 1);
          const cellWidth = rect.width / cols;
          const cellHeight = rect.height / stacks;
          return (
            <g key={compartment.id}>
              <rect
                x={rect.x} y={rect.y} width={Math.max(rect.width, 1)} height={Math.max(rect.height, 1)}
                fill={hasDepth ? "#ccfbf1" : "#e2e8f0"}
                stroke={isSelected ? "#0f766e" : "#14b8a6"}
                strokeWidth={isSelected ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                rx={10}
                className="cursor-pointer"
                onClick={() => onSelect(compartment.id)}
              />
              <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none fill-slate-700 text-[140px] font-semibold" style={{ fontSize: `${Math.min(rect.width, rect.height) / 6}px` }}>
                {compartment.code}
              </text>
              {hasDepth && rect.height > 300 && (
                <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 + Math.min(rect.height / 5, 180)} textAnchor="middle" className="pointer-events-none select-none fill-teal-700 text-[80px]" style={{ fontSize: `${Math.min(rect.width, rect.height) / 10}px` }}>
                  {compartment.depthSlots!.map((slot) => slot.code).join(" · ")}
                </text>
              )}
              {cols * stacks > 1 && Array.from({ length: cols * stacks }, (_, index) => {
                const colIndex = (index % cols) + 1;
                const visualRow = Math.floor(index / cols);
                const stackIndex = stacks - visualRow;
                const isCellSelected = selectedCell?.compartmentId === compartment.id
                  && selectedCell.columnIndex === colIndex
                  && selectedCell.stackIndex === stackIndex;
                return (
                  <rect
                    key={`cell-${colIndex}-${stackIndex}`}
                    x={rect.x + (colIndex - 1) * cellWidth}
                    y={rect.y + visualRow * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={isCellSelected ? "#99f6e4" : "transparent"}
                    fillOpacity={isCellSelected ? 0.7 : 1}
                    stroke="#0f766e"
                    strokeWidth={isCellSelected ? 2.5 : 1}
                    strokeDasharray={isCellSelected ? undefined : "6 8"}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onClick={() => onCellSelect?.({ compartmentId: compartment.id, columnIndex: colIndex, stackIndex })}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[11px] text-slate-500 shadow-sm">
        Haz clic en un compartimento para seleccionarlo
      </div>
    </div>
  );
}
