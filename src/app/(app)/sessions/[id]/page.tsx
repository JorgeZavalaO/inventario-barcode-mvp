"use client";

import { Wifi, LoaderCircle, ScanBarcode, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSessionData } from "@/components/session-data-provider";
import { SessionHero } from "@/components/session/session-hero";
import { SessionMetrics } from "@/components/session/session-metrics";
import { SessionParticipants } from "@/components/session/session-participants";

export default function SessionOverview() {
  const { detail, operator, sending, setToast, submitCount, reverse, closeSession } = useSessionData();

  if (!detail) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <LoaderCircle className="animate-spin text-teal-700" size={34} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SessionHero
        detail={detail}
        operator={operator}
        sending={sending}
        onReverse={(id) => reverse(id)}
        onClose={() => closeSession()}
        onCopyLink={() => {
          void navigator.clipboard.writeText(window.location.href);
          setToast("Enlace de sesión copiado");
        }}
      />

      <SessionMetrics stats={detail.stats} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wifi className="text-emerald-600" size={15} /> Sincronización cada 2 segundos
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/sessions/${detail.session.id}/scan`}
              className="inline-flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-5 text-center hover:bg-muted transition-colors"
            >
              <ScanBarcode size={24} className="text-teal-600" />
              <span className="text-sm font-semibold">Escanear</span>
              <span className="text-xs text-slate-500">Cámara o ingreso manual</span>
            </Link>
            <Link
              href={`/sessions/${detail.session.id}/counts`}
              className="inline-flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-5 text-center hover:bg-muted transition-colors"
            >
              <ClipboardList size={24} className="text-teal-600" />
              <span className="text-sm font-semibold">Resultados</span>
              <span className="text-xs text-slate-500">Comparación de conteo</span>
            </Link>
          </div>
        </div>

        <SessionParticipants
          participants={detail.participants}
          operatorId={operator?.id}
          max={3}
        />
      </section>
    </div>
  );
}
