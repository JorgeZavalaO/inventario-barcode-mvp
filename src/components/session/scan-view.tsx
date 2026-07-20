"use client";

import { Barcode, Send, LoaderCircle, CheckCircle2, PackageSearch, X, Camera, Keyboard } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { EmptyState } from "@/components/session/empty-state";
import type { SessionProduct } from "@/lib/types";

type PendingScan = {
  code: string;
  method: "CAMERA" | "MANUAL" | "USB";
  productName?: string;
};

export function ScanView({
  isOpen,
  hasOperator,
  sending,
  quantity,
  onQuantityChange,
  onSubmitCode,
  products,
}: {
  isOpen: boolean;
  hasOperator: boolean;
  sending: boolean;
  quantity: string;
  onQuantityChange: (q: string) => void;
  onSubmitCode: (code: string, method: "CAMERA" | "MANUAL" | "USB") => Promise<void>;
  products: SessionProduct[];
}) {
  const [manualCode, setManualCode] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [pending, setPending] = useState<PendingScan | null>(null);
  const [scanQty, setScanQty] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => setScanFeedback(""), 2000);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  useEffect(() => {
    if (pending) confirmInputRef.current?.focus();
  }, [pending]);

  const findProduct = useCallback(
    (code: string) => {
      const term = code.trim().toLowerCase();
      return products.find(
        (p) =>
          p.barcode?.toLowerCase() === term ||
          p.code.toLowerCase() === term,
      );
    },
    [products],
  );

  function handleDetected(code: string) {
    const product = findProduct(code);
    setPending({ code, method: "CAMERA", productName: product?.description });
    setScanQty(quantity);
  }

  async function handleConfirm() {
    if (!pending) return;
    const qty = Number(scanQty || quantity || 1);
    onQuantityChange(String(qty));
    await onSubmitCode(pending.code, pending.method);
    setScanFeedback("Producto registrado ✓");
    setPending(null);
    setManualCode("");
    setScanQty("");
    setTimeout(() => confirmInputRef.current?.focus(), 50);
  }

  function handleCancel() {
    setPending(null);
    setScanQty("");
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
    setManualCode("");
  }

  if (!isOpen) return <EmptyState type="closed" />;
  if (!hasOperator) return <EmptyState type="no-operator" />;

  return (
    <div className="mx-auto max-w-2xl">
      {/* ===== CAMERA VIEW: full-screen overlay ===== */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Top bar */}
          <div className="relative z-20 flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => { setCameraActive(false); setPending(null); }}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-white/20"
            >
              <X size={18} /> Detener
            </button>
            <span className="text-xs text-white/60">Cámara activa</span>
          </div>

          {/* Camera feed */}
          <div className="relative flex-1">
            <BarcodeScanner
              onDetected={(code) => handleDetected(code)}
              disabled={sending || !!pending}
            />
          </div>

          {/* Confirmation prompt (overlaid on camera) */}
          {pending && (
            <div className="relative z-20 border-t border-white/10 bg-black/80 backdrop-blur-md px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <PackageSearch size={16} className="text-teal-400" />
                    <span className="font-mono text-xs">{pending.code}</span>
                  </div>
                  {pending.productName ? (
                    <p className="mt-0.5 font-semibold text-white truncate">{pending.productName}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-amber-400">Producto no encontrado en esta sesión</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <Label htmlFor="full-qty" className="sr-only">Cantidad</Label>
                    <Input
                      id="full-qty"
                      ref={confirmInputRef}
                      className="h-9 text-center font-mono bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={scanQty}
                      onChange={(e) => setScanQty(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm(); }}
                    />
                  </div>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white" onClick={() => void handleConfirm()} disabled={sending}>
                    {sending ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Registrar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={handleCancel} disabled={sending}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom: manual input / keyboard toggle */}
          <div className="relative z-20 border-t border-white/10 bg-black/60 backdrop-blur-sm">
            {showManual ? (
              <form onSubmit={handleManualSubmit} className="flex items-center gap-2 px-4 py-3">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={17} />
                  <Input
                    ref={inputRef}
                    className="h-9 pl-10 font-mono bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Código o barcode"
                    disabled={sending || !!pending}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" size="sm" variant="ghost" className="text-white hover:bg-white/10" disabled={sending || !!pending || !manualCode.trim()} aria-label="Registrar">
                  <Send size={18} />
                </Button>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Keyboard size={16} /> Ingresar código manualmente
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== IDLE VIEW: cards layout ===== */}
      {!cameraActive && (
        <div className="space-y-6">
          {scanFeedback && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> {scanFeedback}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escanear producto</CardTitle>
              <CardDescription>
                Escaneá con la cámara. Después ajustá la cantidad y confirmá.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => setCameraActive(true)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-slate-500 hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-700 transition-all"
              >
                <Camera size={32} />
                <span className="text-base font-semibold">Activar cámara</span>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lector USB o ingreso manual</CardTitle>
              <CardDescription>Los lectores USB normalmente escriben el código como un teclado.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <Input
                    ref={inputRef}
                    className="pl-10 font-mono"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Código o barcode"
                    disabled={sending}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" size="icon" disabled={sending || !manualCode.trim()} aria-label="Registrar">
                  <Send size={18} />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
