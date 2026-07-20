"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeLabel({
  value,
  description,
  code,
  compact = false,
}: {
  value: string;
  description: string;
  code: string;
  compact?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      displayValue: true,
      font: "monospace",
      fontSize: compact ? 12 : 16,
      height: compact ? 42 : 64,
      width: compact ? 1.25 : 1.7,
      margin: compact ? 4 : 10,
      background: "#ffffff",
      lineColor: "#101828",
    });
  }, [value, compact]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p
        className={`font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}
      >
        {description}
      </p>
      <p className="mb-1 font-mono text-xs text-slate-500">{code}</p>
      <div className="flex justify-center overflow-hidden">
        <svg ref={ref} aria-label={`Código de barras ${value}`} />
      </div>
    </div>
  );
}
