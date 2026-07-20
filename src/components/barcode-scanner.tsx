"use client";

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function BarcodeScanner({
  onDetected,
  disabled,
  onActiveChange,
}: {
  onDetected: (code: string) => void;
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastScanRef = useRef<{ value: string; at: number }>({
    value: "",
    at: 0,
  });
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject) {
      for (const track of (
        videoRef.current.srcObject as MediaStream
      ).getTracks())
        track.stop();
      videoRef.current.srcObject = null;
    }
    setActive(false);
  };

  const start = async () => {
    if (disabled || !videoRef.current) return;
    setError("");
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (!result) return;
          const value = result.getText().trim();
          const now = Date.now();
          if (
            lastScanRef.current.value === value &&
            now - lastScanRef.current.at < 1800
          )
            return;
          lastScanRef.current = { value, at: now };
          navigator.vibrate?.(80);
          onDetectedRef.current(value);
        },
      );
      setActive(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir la cámara. Verifica los permisos del navegador.",
      );
      stop();
    }
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="relative size-full">
      <video
        ref={videoRef}
        className="size-full object-cover"
        muted
        playsInline
      />
      {!active && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-300 bg-[#101828]">
          <div>
            <ScanLine className="mx-auto mb-3 text-teal-300" size={42} />
            <p className="font-semibold text-white">Escáner por cámara</p>
            <p className="mt-1 text-sm text-slate-400">
              Apunta al código de barras y evita reflejos.
            </p>
          </div>
        </div>
      )}
      {active && <div className="scan-line" />}
      <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/30" />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {!active && (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-500 disabled:opacity-50"
        >
          <Camera size={18} /> Activar cámara
        </button>
      )}
    </div>
  );
}
