"use client";

import { PackageCheck, Clock3, CheckCircle2, CircleAlert, ScanBarcode, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SessionMetrics({ stats }: {
  stats: {
    countedProducts: number;
    pendingProducts: number;
    matchingProducts: number;
    differentProducts: number;
    totalUnits: number;
  };
}) {
  const items: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    style: string;
    wide?: boolean;
  }> = [
    { label: "Contados", value: stats.countedProducts, icon: PackageCheck, style: "text-teal-700 bg-teal-50" },
    { label: "Pendientes", value: stats.pendingProducts, icon: Clock3, style: "text-slate-700 bg-slate-100" },
    { label: "Coinciden", value: stats.matchingProducts, icon: CheckCircle2, style: "text-emerald-700 bg-emerald-50" },
    { label: "Con diferencia", value: stats.differentProducts, icon: CircleAlert, style: "text-amber-700 bg-amber-50" },
    { label: "Unidades", value: Number(stats.totalUnits).toLocaleString("es-PE", { maximumFractionDigits: 3 }), icon: ScanBarcode, style: "text-indigo-700 bg-indigo-50", wide: true },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map(({ label, value, icon: MetricIcon, style, wide }) => (
        <Card key={label} className={`p-4 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
          <span className={`mb-3 grid size-8 place-items-center rounded-lg ${style}`}>
            <MetricIcon size={17} />
          </span>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </Card>
      ))}
    </section>
  );
}
