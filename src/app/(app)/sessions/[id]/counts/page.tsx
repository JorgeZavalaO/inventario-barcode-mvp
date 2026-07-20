"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionData } from "@/components/session-data-provider";
import { CountsView } from "@/components/session/counts-view";

export default function CountsPage() {
  const { detail, loading } = useSessionData();

  if (!detail) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Resultados del conteo</h2>
          <p className="text-sm text-slate-500">
            Comparación contra la fotografía de stock al crear la sesión.
          </p>
        </div>
      </div>

      <CountsView products={detail.products} loading={loading} />
    </div>
  );
}
