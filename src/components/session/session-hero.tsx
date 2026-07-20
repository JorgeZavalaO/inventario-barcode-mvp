"use client";

import { RotateCcw, Lock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SessionDetail } from "@/lib/types";

type Operator = { id: string; name: string };

export function SessionHero({
  detail,
  operator,
  sending,
  onReverse,
  onClose,
  onCopyLink,
}: {
  detail: SessionDetail;
  operator: Operator | null;
  sending: boolean;
  onReverse: (eventId: string) => void;
  onClose: () => void;
  onCopyLink: () => void;
}) {
  const isOpen = detail.session.status === "OPEN";
  const ownLastEvent = detail.events.find(
    (event) => event.operator_id === operator?.id && !event.reversed_at,
  );

  return (
    <section className="overflow-hidden rounded-3xl bg-[#0b1324] p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={isOpen ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-slate-400/30 bg-slate-400/10 text-slate-300"}
            >
              {isOpen ? "Sesión abierta" : "Sesión cerrada"}
            </Badge>
            <button
              type="button"
              onClick={onCopyLink}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono text-xs text-slate-300"
            >
              <Copy size={13} /> {detail.session.code}
            </button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{detail.session.name}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {detail.session.warehouse} · Creada el{" "}
            {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(detail.session.created_at),
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ownLastEvent && isOpen && (
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onReverse(ownLastEvent.id)}
              disabled={sending}
            >
              <RotateCcw size={17} /> Deshacer mi último
            </Button>
          )}
          {isOpen && (
            <Button
              variant="outline"
              className="border-red-300/30 bg-red-400/10 text-red-100 hover:bg-red-400/20"
              onClick={onClose}
              disabled={sending}
            >
              <Lock size={17} /> Cerrar sesión
            </Button>
          )}
        </div>
      </div>
      <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${detail.stats.progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {detail.stats.countedProducts} de {detail.stats.totalProducts} productos encontrados
        </span>
        <span className="font-mono text-teal-200">{detail.stats.progress}%</span>
      </div>
    </section>
  );
}
