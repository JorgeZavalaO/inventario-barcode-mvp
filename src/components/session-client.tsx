"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  LoaderCircle,
  Lock,
  PackageCheck,
  RotateCcw,
  ScanBarcode,
  Search,
  Send,
  UserRound,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { apiFetch } from "@/lib/client";
import type { SessionDetail } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Operator = { id: string; name: string };

function formatNumber(value: number) {
  return Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function differenceStyle(value: number) {
  if (value === 0) return "bg-emerald-50 text-emerald-700";
  if (value > 0) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function SessionClient({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
      setDetail(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la sesión");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  const join = useCallback(async (name: string) => {
    const data = await apiFetch<{ operator: Operator }>(`/api/sessions/${sessionId}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setOperator(data.operator);
    localStorage.setItem("stockscan_operator", JSON.stringify(data.operator));
    return data.operator;
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const saved = localStorage.getItem("stockscan_operator");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Operator;
          setOperator(parsed);
          void join(parsed.name).catch(() => localStorage.removeItem("stockscan_operator"));
        } catch {
          localStorage.removeItem("stockscan_operator");
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [join, load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await join(operatorName);
      setToast(`Bienvenido, ${operatorName}`);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo ingresar");
    } finally {
      setSending(false);
    }
  }

  async function submitCount(code: string, inputMethod: "CAMERA" | "MANUAL" | "USB") {
    if (!operator || !detail || detail.session.status !== "OPEN" || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await apiFetch<{
        duplicate: boolean;
        product?: { description: string; unit: string };
        total?: number;
      }>(`/api/sessions/${sessionId}/counts`, {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          quantity: Number(quantity || 1),
          operatorId: operator.id,
          operationId: crypto.randomUUID(),
          inputMethod,
        }),
      });
      if (!result.duplicate && result.product) {
        setToast(`${result.product.description}: total ${formatNumber(result.total ?? 0)} ${result.product.unit}`);
        setManualCode("");
        navigator.vibrate?.([70, 40, 70]);
      }
      await load(true);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo registrar el conteo";
      setError(message);
      navigator.vibrate?.(250);
    } finally {
      setSending(false);
    }
  }

  async function handleManual(event: FormEvent) {
    event.preventDefault();
    if (manualCode.trim()) await submitCount(manualCode, "MANUAL");
  }

  async function reverse(eventId: string) {
    setSending(true);
    setError("");
    try {
      await apiFetch(`/api/counts/${eventId}/reverse`, { method: "POST", body: "{}" });
      setToast("Conteo anulado");
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo anular");
    } finally {
      setSending(false);
    }
  }

  async function closeSession() {
    if (!confirm("¿Cerrar la sesión? Después no se podrán registrar más conteos.")) return;
    setSending(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/close`, { method: "POST", body: "{}" });
      setToast("Sesión cerrada");
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión");
    } finally {
      setSending(false);
    }
  }

  const filteredProducts = useMemo(() => {
    if (!detail) return [];
    const term = search.trim().toLowerCase();
    if (!term) return detail.products;
    return detail.products.filter((product) =>
      [product.code, product.barcode, product.description, product.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [detail, search]);

  const ownLastEvent = detail?.events.find(
    (event) => event.operator_id === operator?.id && !event.reversed_at,
  );

  if (loading && !detail) {
    return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin text-teal-700" size={34} /></div>;
  }

  if (!detail) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <CircleAlert className="mx-auto mb-3 text-red-500" size={38} />
        <h1 className="text-xl font-bold">No se pudo abrir la sesión</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <Button variant="outline" className="mt-5" render={<Link href="/" />}>
          <ArrowLeft size={17} /> Volver
        </Button>
      </Card>
    );
  }

  const isOpen = detail.session.status === "OPEN";
  const metrics: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    style: string;
    wide?: boolean;
  }> = [
    { label: "Contados", value: detail.stats.countedProducts, icon: PackageCheck, style: "text-teal-700 bg-teal-50" },
    { label: "Pendientes", value: detail.stats.pendingProducts, icon: Clock3, style: "text-slate-700 bg-slate-100" },
    { label: "Coinciden", value: detail.stats.matchingProducts, icon: CheckCircle2, style: "text-emerald-700 bg-emerald-50" },
    { label: "Con diferencia", value: detail.stats.differentProducts, icon: CircleAlert, style: "text-amber-700 bg-amber-50" },
    { label: "Unidades", value: formatNumber(detail.stats.totalUnits), icon: ScanBarcode, style: "text-indigo-700 bg-indigo-50", wide: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" render={<Link href="/" />}>
          <ArrowLeft size={16} /> Panel
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Wifi className="text-emerald-600" size={15} /> Sincronización cada 2 segundos</div>
      </div>

      <section className="overflow-hidden rounded-3xl bg-[#0b1324] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={isOpen ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-slate-400/30 bg-slate-400/10 text-slate-300"}>{isOpen ? "Sesión abierta" : "Sesión cerrada"}</Badge>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(window.location.href); setToast("Enlace de sesión copiado"); }} className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono text-xs text-slate-300"><Copy size={13} /> {detail.session.code}</button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{detail.session.name}</h1>
            <p className="mt-2 text-sm text-slate-400">{detail.session.warehouse} · Creada el {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.session.created_at))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ownLastEvent && isOpen && (
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => void reverse(ownLastEvent.id)} disabled={sending}>
                <RotateCcw size={17} /> Deshacer mi último
              </Button>
            )}
            {isOpen && (
              <Button variant="outline" className="border-red-300/30 bg-red-400/10 text-red-100 hover:bg-red-400/20" onClick={() => void closeSession()} disabled={sending}>
                <Lock size={17} /> Cerrar sesión
              </Button>
            )}
          </div>
        </div>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${detail.stats.progress}%` }} /></div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span>{detail.stats.countedProducts} de {detail.stats.totalProducts} productos encontrados</span><span className="font-mono text-teal-200">{detail.stats.progress}%</span></div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map(({ label, value, icon: MetricIcon, style, wide }) => (
          <Card key={label} className={`p-4 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
            <span className={`mb-3 grid size-8 place-items-center rounded-lg ${style}`}><MetricIcon size={17} /></span>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Escanear producto</CardTitle>
                  <CardDescription>Cada lectura registrará la cantidad configurada.</CardDescription>
                </div>
                <div className="w-24 space-y-1">
                  <Label htmlFor="qty">Cantidad</Label>
                  <Input id="qty" className="text-center font-mono" type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={!isOpen} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BarcodeScanner onDetected={(code) => void submitCount(code, "CAMERA")} disabled={!operator || !isOpen || sending} />
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
                  <Input ref={inputRef} className="pl-10 font-mono" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Código o barcode" disabled={!operator || !isOpen} autoComplete="off" />
                </div>
                <Button type="submit" size="icon" disabled={!operator || !isOpen || sending || !manualCode.trim()} aria-label="Registrar"><Send size={18} /></Button>
              </form>
            </CardContent>
          </Card>

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
                {detail.participants.map((participant) => {
                  return (
                    <div key={participant.id} className="flex items-center gap-3">
                      <span className="relative grid size-9 place-items-center rounded-full bg-slate-100 font-bold text-slate-600">
                        {participant.name.charAt(0).toUpperCase()}
                        <span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white ${participant.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {participant.name}
                          {participant.id === operator?.id && <span className="ml-1 text-xs font-normal text-teal-700">(tú)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{participant.scans} registros · {formatNumber(participant.total_units)} unidades</p>
                      </div>
                      <span className="text-xs text-slate-400">{formatTime(participant.last_seen_at)}</span>
                    </div>
                  );
                })}
                {!detail.participants.length && <p className="py-4 text-center text-sm text-slate-500">Aún no hay participantes.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Resultado del conteo</h2>
                  <p className="text-sm text-slate-500">Comparación contra la fotografía de stock al crear la sesión.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input className="h-9 w-64 max-w-full pl-9 text-sm" placeholder="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="max-h-[38rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Teórico</TableHead>
                    <TableHead>Físico</TableHead>
                    <TableHead>Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{product.description}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{product.code} · {product.barcode}</p>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(product.theoretical_stock)} <span className="text-xs text-slate-400">{product.unit}</span>
                      </TableCell>
                      <TableCell className="tabular-nums font-bold">{formatNumber(product.counted)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex min-w-14 justify-center rounded-lg px-2 py-1 font-mono text-xs font-bold ${product.counted === 0 ? "bg-slate-100 text-slate-500" : differenceStyle(product.difference)}`}>
                          {product.counted === 0 ? "—" : `${product.difference > 0 ? "+" : ""}${formatNumber(product.difference)}`}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="font-bold">Últimos movimientos</h2>
                <p className="text-sm text-slate-500">Bitácora auditable de lecturas y anulaciones.</p>
              </div>
              <ScanBarcode className="text-slate-400" size={21} />
            </div>
            <div className="divide-y divide-slate-100">
              {detail.events.slice(0, 18).map((event) => (
                <div key={event.id} className={`flex items-center gap-3 p-4 ${event.reversed_at ? "opacity-45" : ""}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-sm font-bold text-slate-700">+{formatNumber(event.quantity)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${event.reversed_at ? "line-through" : ""}`}>{event.product_description}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.operator_name} · {event.input_method.toLowerCase()} · {formatTime(event.created_at)}</p>
                  </div>
                  {!event.reversed_at && isOpen && event.operator_id === operator?.id && (
                    <button type="button" onClick={() => void reverse(event.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Anular"><RotateCcw size={16} /></button>
                  )}
                </div>
              ))}
              {!detail.events.length && <div className="p-8 text-center text-sm text-slate-500">Todavía no hay movimientos.</div>}
            </div>
          </Card>
        </div>
      </section>

      {!operator && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 shadow-2xl sm:p-8">
            <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><UserRound size={24} /></span>
            <h2 className="text-2xl font-bold">Identifícate para contar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Tu nombre quedará registrado en cada lectura. Puedes usar esta misma sesión desde varios celulares.</p>
            <form onSubmit={handleJoin} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="operator-name">Nombre del participante</Label>
                <Input id="operator-name" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Ej. Jorge" autoFocus required />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <LoaderCircle className="animate-spin" size={18} /> : <UserRound size={18} />} Ingresar a la sesión
              </Button>
            </form>
          </Card>
        </div>
      )}

      {toast && <div className="toast flex items-center gap-2"><CheckCircle2 className="shrink-0 text-teal-300" size={18} /><span className="text-sm">{toast}</span></div>}
    </div>
  );
}
