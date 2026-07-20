"use client";

import { Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Participant } from "@/lib/types";

function formatNumber(value: number) {
  return Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export function SessionParticipants({
  participants,
  operatorId,
  max = 8,
}: {
  participants: Participant[];
  operatorId?: string;
  max?: number;
}) {
  const visible = participants.slice(0, max);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Participantes</CardTitle>
            <CardDescription>Actividad dentro de esta sesión.</CardDescription>
          </div>
          <Users className="text-slate-400" size={20} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visible.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <span className="relative grid size-9 place-items-center rounded-full bg-slate-100 font-bold text-slate-600">
                {participant.name.charAt(0).toUpperCase()}
                <span
                  className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white ${
                    participant.active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {participant.name}
                  {participant.id === operatorId && <span className="ml-1 text-xs font-normal text-teal-700">(tú)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {participant.scans} registros · {formatNumber(participant.total_units)} unidades
                </p>
              </div>
              <span className="text-xs text-slate-400">{formatTime(participant.last_seen_at)}</span>
            </div>
          ))}
          {!participants.length && <p className="py-4 text-center text-sm text-slate-500">Aún no hay participantes.</p>}
          {participants.length > max && (
            <p className="text-center text-xs text-slate-400">
              +{participants.length - max} participantes más
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
