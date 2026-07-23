"use client";

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
  onSelect: (id: string | null) => void;
  onCellSelect?: (cell: { compartmentId: string; columnIndex: number; stackIndex: number }) => void;
};

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
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
      {compartments.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center bg-slate-50 px-4 text-center text-xs text-slate-500" role="status">
          La vista frontal aparecerá aquí después de aplicar una configuración.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${rackWidth} ${rackHeight}`}
          className="block max-h-[24rem] min-h-56 w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Vista frontal interactiva del rack. Usa Tab para recorrer compartimentos."
        >
          <rect width={rackWidth} height={rackHeight} fill="#f8fafc" onClick={() => onSelect(null)} />
          <rect x={0} y={0} width={rackWidth} height={rackHeight} fill="none" stroke="#94a3b8" strokeWidth={12} vectorEffect="non-scaling-stroke" pointerEvents="none" />

          {compartments.map((compartment) => {
            const rect = { x: compartment.x, y: compartment.y, width: compartment.width, height: compartment.height };
          const isSelected = selectedId === compartment.id;
          const hasDepth = (compartment.depthSlots?.length ?? 0) > 0;
          const cols = Math.max(compartment.columnCount ?? 1, 1);
          const stacks = Math.max(compartment.stackLevels ?? 1, 1);
          const cellWidth = rect.width / cols;
          const cellHeight = rect.height / stacks;
            const activateCompartment = () => onSelect(compartment.id);
            return (
              <g key={compartment.id}>
              <title>{`${compartment.code}, ${compartment.name}. ${cols} columnas, ${stacks} filas, ${compartment.depthSlots?.length || 1} profundidades.`}</title>
              <rect
                x={rect.x} y={rect.y} width={Math.max(rect.width, 1)} height={Math.max(rect.height, 1)}
                fill={hasDepth ? "#ccfbf1" : "#e2e8f0"}
                stroke={isSelected ? "#0f766e" : "#14b8a6"}
                strokeWidth={isSelected ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                rx={10}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Seleccionar ${compartment.code}, ${compartment.name}`}
                aria-pressed={isSelected}
                onClick={activateCompartment}
                onFocus={activateCompartment}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activateCompartment();
                  }
                }}
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Seleccionar celda columna ${colIndex}, fila ${stackIndex} de ${compartment.code}`}
                    aria-pressed={isCellSelected}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(compartment.id);
                      onCellSelect?.({ compartmentId: compartment.id, columnIndex: colIndex, stackIndex });
                    }}
                    onFocus={() => onSelect(compartment.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(compartment.id);
                        onCellSelect?.({ compartmentId: compartment.id, columnIndex: colIndex, stackIndex });
                      }
                    }}
                  />
                );
              })}
            </g>
            );
          })}
        </svg>
      )}
      {compartments.length > 0 && <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Clic o Tab para seleccionar · Enter/Espacio para activar</div>}
    </div>
  );
}
