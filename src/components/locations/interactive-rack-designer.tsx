"use client";

import { useRef, useState } from "react";
import {
  clamp,
  isWithinBounds,
  moveRect,
  rectsOverlap,
  resizeRect,
  snapToGrid,
  type Rect,
  type ResizeHandle,
} from "@/lib/rack-validation";

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

type Interaction =
  | { type: "moving"; id: string; origin: { x: number; y: number }; initial: Rect }
  | { type: "resizing"; id: string; handle: ResizeHandle; origin: { x: number; y: number }; initial: Rect }
  | { type: "drawing"; origin: { x: number; y: number } };

type Props = {
  compartments: DesignerCompartment[];
  rackWidth: number;
  rackHeight: number;
  selectedId: string | null;
  selectedCell?: { compartmentId: string; columnIndex: number; stackIndex: number } | null;
  selectedDepthIndex?: number;
  drawMode?: boolean;
  snapEnabled?: boolean;
  gridSize?: number;
  showGrid?: boolean;
  onSelect: (id: string | null) => void;
  onCellSelect?: (cell: { compartmentId: string; columnIndex: number; stackIndex: number }) => void;
  onCommit: (id: string, rect: Rect) => void;
  onCreateFromRect?: (rect: Rect) => void;
  onInvalid?: (message: string) => void;
};

const handles: Array<{ name: ResizeHandle; cursor: string; x: number; y: number }> = [
  { name: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { name: "n", cursor: "ns-resize", x: 0.5, y: 0 },
  { name: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { name: "e", cursor: "ew-resize", x: 1, y: 0.5 },
  { name: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { name: "s", cursor: "ns-resize", x: 0.5, y: 1 },
  { name: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { name: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];

function asRect(compartment: DesignerCompartment): Rect {
  return {
    x: compartment.x,
    y: compartment.y,
    width: compartment.width,
    height: compartment.height,
  };
}

function drawRect(origin: { x: number; y: number }, point: { x: number; y: number }, width: number, height: number, grid: number): Rect {
  const x1 = snapToGrid(origin.x, grid);
  const y1 = snapToGrid(origin.y, grid);
  const x2 = snapToGrid(point.x, grid);
  const y2 = snapToGrid(point.y, grid);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function InteractiveRackDesigner({
  compartments,
  rackWidth,
  rackHeight,
  selectedId,
  selectedCell = null,
  selectedDepthIndex = 0,
  drawMode = false,
  snapEnabled = true,
  gridSize = 100,
  showGrid = true,
  onSelect,
  onCellSelect,
  onCommit,
  onCreateFromRect,
  onInvalid,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [preview, setPreview] = useState<{ id?: string; rect: Rect } | null>(null);
  const grid = snapEnabled ? gridSize : 1;
  const selected = compartments.find((compartment) => compartment.id === selectedId);
  const previewRect = preview?.rect;

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const logical = point.matrixTransform(matrix.inverse());
    return { x: clamp(logical.x, 0, rackWidth), y: clamp(logical.y, 0, rackHeight) };
  }

  function startMove(event: React.PointerEvent<SVGElement>, compartment: DesignerCompartment) {
    event.stopPropagation();
    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>);
    if (!point) return;
    onSelect(compartment.id);
    svgRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ type: "moving", id: compartment.id, origin: point, initial: asRect(compartment) });
    setPreview({ id: compartment.id, rect: asRect(compartment) });
  }

  function startResize(event: React.PointerEvent<SVGRectElement>, compartment: DesignerCompartment, handle: ResizeHandle) {
    event.stopPropagation();
    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>);
    if (!point) return;
    onSelect(compartment.id);
    svgRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ type: "resizing", id: compartment.id, handle, origin: point, initial: asRect(compartment) });
    setPreview({ id: compartment.id, rect: asRect(compartment) });
  }

  function startDrawing(event: React.PointerEvent<SVGRectElement>) {
    if (!drawMode) {
      onSelect(null);
      return;
    }
    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>);
    if (!point) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ type: "drawing", origin: point });
    setPreview({ rect: { x: point.x, y: point.y, width: 0, height: 0 } });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    const point = pointFromEvent(event);
    if (!point) return;
    if (interaction.type === "drawing") {
      setPreview({ rect: drawRect(interaction.origin, point, rackWidth, rackHeight, grid) });
      return;
    }
    const delta = { x: point.x - interaction.origin.x, y: point.y - interaction.origin.y };
    const rect = interaction.type === "moving"
      ? moveRect(interaction.initial, delta, rackWidth, rackHeight, grid)
      : resizeRect(interaction.initial, interaction.handle, delta, rackWidth, rackHeight, 2, grid);
    setPreview({ id: interaction.id, rect });
  }

  function finishPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    const current = preview;
    setInteraction(null);
    setPreview(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    if (!current) return;

    if (interaction.type === "drawing") {
      if (current.rect.width >= 2 && current.rect.height >= 2) onCreateFromRect?.(current.rect);
      return;
    }
    const otherCompartments = compartments.filter((compartment) => compartment.id !== interaction.id);
    const invalid = !isWithinBounds(current.rect, rackWidth, rackHeight)
      || otherCompartments.some((compartment) => rectsOverlap(current.rect, compartment));
    if (invalid) {
      onInvalid?.("El compartimento queda fuera del rack o solapa con otro");
      return;
    }
    onCommit(interaction.id, current.rect);
  }

  function cancelPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    setInteraction(null);
    setPreview(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  }

  const renderRect = (compartment: DesignerCompartment): Rect => (
    preview?.id === compartment.id && previewRect ? previewRect : asRect(compartment)
  );
  const handleSize = Math.max(rackWidth, rackHeight) / 70;

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${rackWidth} ${rackHeight}`}
        className="block h-auto min-h-[360px] w-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer}
        role="application"
        aria-label="Diseñador visual del rack"
      >
        <defs>
          <pattern id="rack-designer-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#cbd5e1" strokeWidth={Math.max(gridSize / 100, 1)} opacity="0.55" />
          </pattern>
        </defs>
        <rect width={rackWidth} height={rackHeight} fill="#f8fafc" onPointerDown={startDrawing} />
        {showGrid && <rect width={rackWidth} height={rackHeight} fill="url(#rack-designer-grid)" pointerEvents="none" />}
        <rect x={0} y={0} width={rackWidth} height={rackHeight} fill="none" stroke="#94a3b8" strokeWidth={12} vectorEffect="non-scaling-stroke" pointerEvents="none" />

        {compartments.map((compartment) => {
          const rect = renderRect(compartment);
          const isSelected = selectedId === compartment.id;
          const isPreviewInvalid = preview?.id === compartment.id && (
            !isWithinBounds(rect, rackWidth, rackHeight)
            || compartments.some((other) => other.id !== compartment.id && rectsOverlap(rect, other))
          );
          const hasDepth = (compartment.depthSlots?.length ?? 0) > 0;
          const columnCount = Math.max(compartment.columnCount ?? 1, 1);
          const stackLevels = Math.max(compartment.stackLevels ?? 1, 1);
          const cellWidth = rect.width / columnCount;
          const cellHeight = rect.height / stackLevels;
          return (
            <g key={compartment.id} onPointerDown={(event) => startMove(event, compartment)}>
              <rect
                x={rect.x} y={rect.y} width={Math.max(rect.width, 1)} height={Math.max(rect.height, 1)}
                fill={isPreviewInvalid ? "#fee2e2" : hasDepth ? "#ccfbf1" : "#e2e8f0"}
                stroke={isPreviewInvalid ? "#ef4444" : isSelected ? "#0f766e" : "#14b8a6"}
                strokeWidth={isSelected ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                rx={10}
              />
              <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none fill-slate-700 text-[140px] font-semibold" style={{ fontSize: `${Math.min(rect.width, rect.height) / 6}px` }}>
                {compartment.code}
              </text>
              {hasDepth && rect.height > 300 && (
                <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 + Math.min(rect.height / 5, 180)} textAnchor="middle" className="pointer-events-none select-none fill-teal-700 text-[80px]" style={{ fontSize: `${Math.min(rect.width, rect.height) / 10}px` }}>
                  {compartment.depthSlots!.map((slot) => slot.code).join(" · ")}
                </text>
              )}
              {columnCount * stackLevels > 1 && Array.from({ length: columnCount * stackLevels }, (_, index) => {
                const columnIndex = (index % columnCount) + 1;
                const visualRow = Math.floor(index / columnCount);
                const stackIndex = stackLevels - visualRow;
                const isCellSelected = selectedCell?.compartmentId === compartment.id
                  && selectedCell.columnIndex === columnIndex
                  && selectedCell.stackIndex === stackIndex
                  && selectedDepthIndex === 0;
                return (
                  <rect
                    key={`cell-${columnIndex}-${stackIndex}`}
                    x={rect.x + (columnIndex - 1) * cellWidth}
                    y={rect.y + visualRow * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={isCellSelected ? selectedDepthIndex === 0 ? "#99f6e4" : "#fcd34d" : "transparent"}
                    fillOpacity={isCellSelected ? 0.7 : 1}
                    stroke="#0f766e"
                    strokeWidth={isCellSelected ? 2.5 : 1}
                    strokeDasharray={isCellSelected ? undefined : "6 8"}
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={(event) => {
                      onCellSelect?.({ compartmentId: compartment.id, columnIndex, stackIndex });
                      startMove(event, compartment);
                    }}
                  />
                );
              })}
              {isSelected && handles.map((handle) => {
                const hx = rect.x + rect.width * handle.x - handleSize / 2;
                const hy = rect.y + rect.height * handle.y - handleSize / 2;
                return (
                  <rect
                    key={handle.name}
                    x={hx} y={hy} width={handleSize} height={handleSize}
                    fill="#ffffff" stroke="#0f766e" strokeWidth={2} vectorEffect="non-scaling-stroke"
                    style={{ cursor: handle.cursor }}
                    onPointerDown={(event) => startResize(event, compartment, handle.name)}
                  />
                );
              })}
            </g>
          );
        })}
        {interaction?.type === "drawing" && previewRect && previewRect.width > 0 && previewRect.height > 0 && (
          <rect x={previewRect.x} y={previewRect.y} width={previewRect.width} height={previewRect.height} fill="#fef3c7" stroke="#d97706" strokeDasharray="20 12" strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[11px] text-slate-500 shadow-sm">
        {drawMode ? "Arrastra en un espacio vacío para crear" : selected ? `${selected.code}: arrastra para mover o usa los controles para redimensionar` : "Selecciona un compartimento"}
      </div>
    </div>
  );
}
