"use client";

import { Barcode, Send, LoaderCircle, CheckCircle2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { EmptyState } from "@/components/session/empty-state";

export function ScanView({
  isOpen,
  hasOperator,
  sending,
  quantity,
  onQuantityChange,
  onSubmitCode,
}: {
  isOpen: boolean;
  hasOperator: boolean;
  sending: boolean;
  quantity: string;
  onQuantityChange: (q: string) => void;
  onSubmitCode: (code: string, method: "CAMERA" | "MANUAL" | "USB") => Promise<void>;
}) {
  const [manualCode, setManualCode] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => setScanFeedback(""), 2000);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  const handleScan = useCallback(
    async (code: string, method: "CAMERA" | "MANUAL" | "USB") => {
      await onSubmitCode(code, method);
      setScanFeedback("Producto registrado ✓");
      setManualCode("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [onSubmitCode],
  );

  async function handleManual(event: FormEvent) {
    event.preventDefault();
    if (manualCode.trim()) await handleScan(manualCode, "MANUAL");
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Escanear producto</CardTitle>
              <CardDescription>Cada lectura registrará la cantidad configurada.</CardDescription>
            </div>
            <div className="w-24 space-y-1">
              <Label htmlFor="scan-qty">Cantidad</Label>
              <Input
                id="scan-qty"
                className="text-center font-mono"
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BarcodeScanner
            onDetected={(code) => void handleScan(code, "CAMERA")}
            disabled={sending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lector USB o ingreso manual</CardTitle>
          <CardDescription>Los lectores USB normalmente escriben el código como un teclado.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManual} className="flex gap-2">
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
              {sending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
