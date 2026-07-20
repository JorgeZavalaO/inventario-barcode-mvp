"use client";

import { Barcode, Send, LoaderCircle, CheckCircle2, PackageSearch } from "lucide-react";
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
    setTimeout(() => inputRef.current?.focus(), 50);
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

  if (!isOpen) {
    return <EmptyState type="closed" />;
  }

  if (!hasOperator) {
    return <EmptyState type="no-operator" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {scanFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {scanFeedback}
        </div>
      )}

      {pending && (
        <Card className="border-teal-200 bg-teal-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <PackageSearch size={16} className="text-teal-600" />
                  <span className="font-mono text-xs">{pending.code}</span>
                </div>
                {pending.productName ? (
                  <p className="mt-0.5 font-semibold text-slate-900 truncate">{pending.productName}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-amber-600">Producto no encontrado en esta sesión</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24">
                  <Label htmlFor="confirm-qty" className="sr-only">Cantidad</Label>
                  <Input
                    id="confirm-qty"
                    ref={confirmInputRef}
                    className="text-center font-mono"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={scanQty}
                    onChange={(e) => setScanQty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm(); }}
                  />
                </div>
                <Button size="sm" onClick={() => void handleConfirm()} disabled={sending}>
                  {sending ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Registrar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} disabled={sending}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Escanear producto</CardTitle>
              <CardDescription>
                Escaneá con la cámara. Después ajustá la cantidad y confirmá.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BarcodeScanner
            onDetected={(code) => handleDetected(code)}
            disabled={sending || !!pending}
          />
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
                disabled={sending || !!pending}
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="icon" disabled={sending || !!pending || !manualCode.trim()} aria-label="Registrar">
              <Send size={18} />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
