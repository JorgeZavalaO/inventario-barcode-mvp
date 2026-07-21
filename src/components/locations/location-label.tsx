"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export type LocationData = {
  id: string;
  code: string;
  qrValue: string;
  warehouseName: string;
  floorName: string;
  zoneName: string;
  rackName: string;
  rackCode: string;
  compartmentName: string;
  depthName: string;
};

type Props = {
  location: LocationData;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function LocationLabel({ location, size = "md", className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeMap = { sm: 100, md: 140, lg: 180 };
  const qrSize = sizeMap[size];

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, location.qrValue, {
        width: qrSize,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      });
    }
  }, [location.qrValue, qrSize]);

  return (
    <div className={`inline-flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 ${size === "sm" ? "w-32" : size === "md" ? "w-44" : "w-56"} ${className}`}>
      <canvas ref={canvasRef} className="mb-2" />
      <div className="w-full text-center">
        <p className="text-sm font-bold tracking-tight">{location.code}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{location.warehouseName} / {location.floorName}</p>
        <p className="text-[10px] text-slate-500">{location.rackName} ({location.rackCode})</p>
        <p className="text-[10px] text-slate-500">{location.compartmentName} · {location.depthName}</p>
      </div>
    </div>
  );
}
