type Compartment = {
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
  compartments: Compartment[];
  widthMm?: number | null;
  heightMm?: number | null;
};

export function RackFrontView({ compartments, widthMm, heightMm }: Props) {
  const rackWidth = Math.max(widthMm ?? Math.max(...compartments.map((c) => c.x + c.width), 10000), 1);
  const rackHeight = Math.max(heightMm ?? Math.max(...compartments.map((c) => c.y + c.height), 10000), 1);

  if (compartments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
        Sin compartimentos
      </div>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${rackWidth} ${rackHeight}`} className="w-full rounded-lg border border-slate-200 bg-white" preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={rackWidth} height={rackHeight} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {compartments.map((comp) => {
          const x = comp.x;
          const y = comp.y;
          const w = Math.max(comp.width, 1);
          const h = Math.max(comp.height, 1);
          const hasDepth = (comp.depthSlots?.length ?? 0) > 0;
          const columnCount = Math.max(comp.columnCount ?? 1, 1);
          const stackLevels = Math.max(comp.stackLevels ?? 1, 1);
          return (
            <g key={comp.id}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={hasDepth ? "#ecfdf5" : "#f1f5f9"}
                stroke="#14b8a6" strokeWidth={1.5} rx={3}
                className="transition-opacity hover:opacity-80"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={x + w / 2} y={y + h / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                className="fill-slate-600 font-medium"
                style={{ fontSize: `${Math.min(w, h) / 6}px` }}
              >
                {comp.code}
              </text>
              {columnCount * stackLevels > 1 && Array.from({ length: columnCount - 1 }, (_, index) => (
                <line key={`column-${index}`} x1={x + (w / columnCount) * (index + 1)} y1={y} x2={x + (w / columnCount) * (index + 1)} y2={y + h} stroke="#94a3b8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {columnCount * stackLevels > 1 && Array.from({ length: stackLevels - 1 }, (_, index) => (
                <line key={`level-${index}`} x1={x} y1={y + (h / stackLevels) * (index + 1)} x2={x + w} y2={y + (h / stackLevels) * (index + 1)} stroke="#94a3b8" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {hasDepth && (
                <text
                  x={x + w / 2} y={y + h / 2 + 11}
                  textAnchor="middle" dominantBaseline="middle"
                  className="fill-teal-500"
                  style={{ fontSize: `${Math.min(w, h) / 10}px` }}
                >
                  {comp.depthSlots!.map((s) => s.code).join(" · ")}
                </text>
              )}
              {comp.moduleLabel && (
                <text x={x + 2} y={y + Math.min(h / 5, 120)} className="fill-slate-400" style={{ fontSize: `${Math.min(w, h) / 10}px` }}>{comp.moduleLabel}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
