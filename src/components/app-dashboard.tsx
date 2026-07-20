"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Package,
  ScanBarcode,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { InventorySession, Product } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useScanTarget } from "@/hooks/use-scan-target";
import { SessionPickerSheet } from "@/components/session/session-picker-sheet";

export function AppDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [productData, sessionData] = await Promise.all([
        apiFetch<{ products: Product[] }>("/api/products"),
        apiFetch<{ sessions: InventorySession[] }>("/api/sessions"),
      ]);
      setProducts(productData.products);
      setSessions(sessionData.sessions);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  const openSessionsCount = sessions.filter((s) => s.status === "OPEN").length;
  const totalUnits = sessions.reduce((t, s) => t + Number(s.total_units ?? 0), 0);
  const { openSessions, target, hasMultiple } = useScanTarget();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-[#0b1324] px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold text-teal-200">
              <Sparkles size={14} /> Conteo colaborativo en tiempo real
            </span>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Panel de control
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Administra productos, crea sesiones de inventario y coordina el conteo con tu equipo en tiempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" render={<Link href="/products" />}>
                <Package size={17} /> Ir a productos
              </Button>
              <Button className="bg-teal-600 text-white hover:bg-teal-500" render={<Link href="/sessions" />}>
                <ClipboardList size={17} /> Ir a sesiones
              </Button>
              <Button variant="outline" className="border-teal-400/30 bg-teal-400/10 text-teal-200 hover:bg-teal-400/20" render={
                hasMultiple ? <button type="button" onClick={() => setSheetOpen(true)} /> : <Link href={target} />
              }>
                <ScanBarcode size={17} /> Escanear ahora
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-3xl font-bold tabular-nums">{loading ? "..." : products.length}</p>
              <p className="mt-1 text-xs text-slate-400">Productos activos</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-3xl font-bold tabular-nums">{loading ? "..." : openSessionsCount}</p>
              <p className="mt-1 text-xs text-slate-400">Sesiones abiertas</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-3xl font-bold tabular-nums">{loading ? "..." : totalUnits.toLocaleString("es-PE")}</p>
              <p className="mt-1 text-xs text-slate-400">Unidades registradas históricamente</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <CardTitle className="text-base">Sesiones recientes</CardTitle>
              <CardDescription>Últimas sesiones del sistema.</CardDescription>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/sessions" />}>
              Ver todo <ArrowRight size={15} />
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <ClipboardList className="mx-auto mb-2 text-slate-300" size={30} />
                Crea una sesión desde el módulo de sesiones.
              </div>
            ) : sessions.slice(0, 5).map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-600">
                  {session.product_count ? Math.round(((session.counted_products ?? 0) / session.product_count) * 100) : 0}%
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{session.name}</p>
                    <Badge
                      variant="outline"
                      className={session.status === "OPEN" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : session.status === "PAUSED" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600"}
                    >
                      {session.status === "OPEN" ? "Abierta" : session.status === "PAUSED" ? "Pausada" : "Cerrada"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{session.warehouse} · {session.counted_products ?? 0}/{session.product_count ?? 0} productos</p>
                </div>
                <ArrowRight className="shrink-0 text-slate-400" size={18} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <CardTitle className="text-base">Acceso rápido</CardTitle>
              <CardDescription>Funciones principales del sistema.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 p-5">
            <Link href="/products" className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center transition hover:border-teal-200 hover:bg-teal-50/30">
              <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700"><Package size={24} /></span>
              <span className="font-semibold text-slate-900">Productos</span>
              <span className="text-xs text-slate-500">Catálogo y registro</span>
            </Link>
            {hasMultiple ? (
              <button type="button" onClick={() => setSheetOpen(true)} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center transition hover:border-teal-200 hover:bg-teal-50/30 cursor-pointer">
                <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ScanBarcode size={24} /></span>
                <span className="font-semibold text-slate-900">Escanear</span>
                <span className="text-xs text-slate-500">Códigos de barras</span>
              </button>
            ) : (
              <Link href={target} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center transition hover:border-teal-200 hover:bg-teal-50/30">
                <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ScanBarcode size={24} /></span>
                <span className="font-semibold text-slate-900">Escanear</span>
                <span className="text-xs text-slate-500">Códigos de barras</span>
              </Link>
            )}
            <Link href="/sessions" className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center transition hover:border-teal-200 hover:bg-teal-50/30">
              <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ClipboardList size={24} /></span>
              <span className="font-semibold text-slate-900">Sesiones</span>
              <span className="text-xs text-slate-500">Conteo y resultados</span>
            </Link>
          </CardContent>
        </Card>
      </section>
      <SessionPickerSheet sessions={openSessions} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
