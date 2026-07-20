"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionDataProvider, useSessionData } from "@/components/session-data-provider";
import { SessionJoinForm } from "@/components/session/session-join-form";

const tabs = [
  { label: "Resumen", href: "" },
  { label: "Escanear", href: "/scan" },
  { label: "Resultados", href: "/counts" },
  { label: "Actividad", href: "/activity" },
];

function SessionShell({ children, sessionId }: { children: React.ReactNode; sessionId: string }) {
  const pathname = usePathname();
  const { detail, operator, loading, error, toast, join, sending } = useSessionData();

  const basePath = `/sessions/${sessionId}`;
  const currentTab = tabs.findIndex((t) => pathname === basePath + t.href);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Volver a sesiones
        </Link>
        {detail && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className={`size-2 rounded-full ${detail.session.status === "OPEN" ? "bg-emerald-500" : "bg-slate-400"}`} />
              {detail.session.code}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <nav className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, i) => (
          <Link
            key={tab.href}
            href={basePath + tab.href}
            className={`px-4 pb-3 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              i === currentTab
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {loading && !detail ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        children
      )}

      {!operator && detail && detail.session.status === "OPEN" && (
        <SessionJoinForm onSubmit={(name) => { void join(name); }} sending={sending} />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-80 flex items-center gap-2 max-w-sm rounded-xl bg-[#101828] px-4 py-3 text-sm text-white shadow-2xl">
          <CheckCircle2 className="shrink-0 text-teal-300" size={18} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SessionDataProvider sessionId={id}>
      <SessionShell sessionId={id}>{children}</SessionShell>
    </SessionDataProvider>
  );
}
