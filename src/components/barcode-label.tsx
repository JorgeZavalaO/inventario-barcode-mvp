"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export type LabelFormat = "CODE128" | "QR";

export function BarcodeLabel({
  value,
  description,
  code,
  compact = false,
  format = "CODE128",
}: {
  value: string;
  description: string;
  code: string;
  compact?: boolean;
  format?: LabelFormat;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value) return;
    if (format === "QR") {
      if (!canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, {
        width: compact ? 120 : 180,
        margin: compact ? 0 : 1,
        color: { dark: "#101828", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
    } else {
      if (!svgRef.current) return;
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: true,
        font: "monospace",
        fontSize: compact ? 14 : 16,
        height: compact ? 48 : 64,
        width: compact ? 1.6 : 1.7,
        margin: compact ? 4 : 10,
        background: "#ffffff",
        lineColor: "#101828",
      });
    }
  }, [value, compact, format]);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white text-center ${compact ? "p-2" : "p-3"}`}>
      <p className={`font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>
        {description}
      </p>
      <p className="mb-1 font-mono text-xs text-slate-500">
        {code}
      </p>
      <div className="flex justify-center overflow-hidden">
        {format === "QR" ? (
          <canvas ref={canvasRef} aria-label={`Código QR ${value}`} />
        ) : (
          <svg ref={svgRef} aria-label={`Código de barras ${value}`} />
        )}
      </div>
    </div>
  );
}
