"use client";

import { useSessionData } from "@/components/session-data-provider";
import { ActivityView } from "@/components/session/activity-view";

export default function ActivityPage() {
  const { detail, operator, reverse, sending } = useSessionData();

  if (!detail) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Actividad</h2>
        <p className="text-sm text-slate-500">Bitácora auditable de lecturas y anulaciones.</p>
      </div>

      <ActivityView
        events={detail.events}
        isOpen={detail.session.status === "OPEN"}
        operatorId={operator?.id}
        onReverse={(id) => reverse(id)}
        sending={sending}
      />
    </div>
  );
}
