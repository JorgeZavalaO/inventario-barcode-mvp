"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { InventorySession } from "@/lib/types";

export function useScanTarget() {
  const [openSessions, setOpenSessions] = useState<InventorySession[]>([]);

  useEffect(() => {
    apiFetch<{ sessions: InventorySession[] }>("/api/sessions")
      .then((data) => {
        setOpenSessions(data.sessions.filter((s) => s.status === "OPEN"));
      })
      .catch(() => {});
  }, []);

  const target =
    openSessions.length === 1
      ? `/sessions/${openSessions[0].id}/scan`
      : "/sessions";

  return { openSessions, target, hasMultiple: openSessions.length > 1 };
}
