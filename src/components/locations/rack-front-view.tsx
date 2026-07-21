import { useMemo } from "react";

type Compartment = {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  const svgWidth = 600;
  const svgHeight = 400;

  const maxCoord = useMemo(() => {
    let mx = 10000;
    let my = 10000;
    for (const c of compartments) {
      if (c.x + c.width > mx) mx = c.x + c.width;
      if (c.y + c.height > my) my = c.y + c.height;
    }
    return { x: Math.max(mx, 1), y: Math.max(my, 1) };
  }, [compartments]);

  const scale = (val: number, max: number, target: number) => (val / max) * target;

  if (compartments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
        Sin compartimentos
      </div>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full rounded-lg border border-slate-200 bg-white" preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={2} />
        {compartments.map((comp) => {
          const x = scale(comp.x, maxCoord.x, svgWidth - 4) + 2;
          const y = scale(comp.y, maxCoord.y, svgHeight - 4) + 2;
          const w = Math.max(scale(comp.width, maxCoord.x, svgWidth - 4), 4);
          const h = Math.max(scale(comp.height, maxCoord.y, svgHeight - 4), 4);
          const hasDepth = (comp.depthSlots?.length ?? 0) > 0;
          return (
            <g key={comp.id}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={hasDepth ? "#ecfdf5" : "#f1f5f9"}
                stroke="#14b8a6" strokeWidth={1.5} rx={3}
                className="transition-opacity hover:opacity-80"
              />
              <text
                x={x + w / 2} y={y + h / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                className="fill-slate-600 text-[10px] font-medium"
              >
                {comp.code}
              </text>
              {hasDepth && (
                <text
                  x={x + w / 2} y={y + h / 2 + 11}
                  textAnchor="middle" dominantBaseline="middle"
                  className="fill-teal-500 text-[8px]"
                >
                  {comp.depthSlots!.map((s) => s.code).join(" · ")}
                </text>
              )}
              {comp.moduleLabel && (
                <text x={x + 2} y={y + 10} className="fill-slate-400 text-[8px]">{comp.moduleLabel}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
