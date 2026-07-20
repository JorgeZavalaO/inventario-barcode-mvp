"use client";

import { useSessionData } from "@/components/session-data-provider";
import { ScanView } from "@/components/session/scan-view";

export default function ScanPage() {
  const { detail, operator, quantity, setQuantity, submitCount, sending } = useSessionData();

  if (!detail) return null;

  return (
    <div>
      <h2 className="text-lg font-bold">Escanear productos</h2>
      <p className="mb-6 text-sm text-slate-500">
        Escaneá el código de barras y luego ingresá la cantidad contada.
      </p>

      <ScanView
        isOpen={detail.session.status === "OPEN"}
        hasOperator={!!operator}
        sending={sending}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onSubmitCode={submitCount}
        products={detail.products}
      />
    </div>
  );
}
