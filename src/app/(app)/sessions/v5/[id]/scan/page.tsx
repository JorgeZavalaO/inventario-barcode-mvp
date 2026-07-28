"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  History,
  LoaderCircle,
  Search,
  ScanBarcode,
  Send,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatDateTimeLima } from "@/lib/date-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Operator = { id: string; name: string };

type Product = {
  id: string;
  code: string;
  description: string;
  unit: string;
  supplierCode: string | null;
};

type V5Event = {
  id: string;
  productCode: string;
  productDescription: string;
  productUnit: string;
  operatorName: string;
  cajas: number;
  unidadesPorCaja: number;
  total: number;
  notes: string;
  createdAt: string;
};

type Session = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type SessionResponse = {
  session: Session;
  events: V5Event[];
  summary: {
    totalRecords: number;
    totalCajas: number;
    totalUnits: number;
    productCount: number;
  };
};

export default function V5ScanPage() {
  const params = useParams();
  const id = params.id as string;
  const productInputRef = useRef<HTMLInputElement>(null);
  const boxesInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<V5Event[]>([]);
  const [summary, setSummary] = useState<SessionResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [cajas, setCajas] = useState(1);
  const [unidadesPorCaja, setUnidadesPorCaja] = useState(1);
  const [notes, setNotes] = useState("");
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<SessionResponse>(`/api/sessions/v5/${id}`);
      startTransition(() => {
        setSession(data.session);
        setEvents(data.events);
        setSummary(data.summary);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la sesión");
    } finally {
      setLoading(false);
    }
  }, [id, startTransition]);

  useEffect(() => {
    const operatorStorageKey = `stockscan_operator_v5_${id}`;
    const stored = localStorage.getItem(operatorStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Operator;
      startTransition(() => {
        setOperator(parsed);
        setOperatorName(parsed.name);
      });
    } catch {
      localStorage.removeItem(operatorStorageKey);
    }
  }, [id, startTransition]);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const total = cajas * unidadesPorCaja;

  async function handleJoin() {
    if (!operatorName.trim()) return;
    setJoining(true);
    setError("");
    try {
      const data = await apiFetch<{ operator: Operator }>(`/api/sessions/v5/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ name: operatorName.trim() }),
      });
      setOperator(data.operator);
      setOperatorName(data.operator.name);
      localStorage.setItem(`stockscan_operator_v5_${id}`, JSON.stringify(data.operator));
      setToast(`Operador ${data.operator.name} identificado`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo identificar al operador");
    } finally {
      setJoining(false);
    }
  }

  function handleProductChange(value: string) {
    setProductCode(value);
    setProduct(null);
    setError("");
  }

  async function handleProductSearch() {
    const code = productCode.trim();
    if (!code) return;
    setProductLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ product: Product }>(`/api/products/by-code?code=${encodeURIComponent(code)}`);
      setProduct(data.product);
      window.setTimeout(() => boxesInputRef.current?.focus(), 100);
    } catch (cause) {
      setProduct(null);
      setError(cause instanceof Error ? cause.message : "Producto no encontrado");
    } finally {
      setProductLoading(false);
    }
  }

  async function handleRegister() {
    if (!operator) {
      setError("Identifica al operador antes de guardar");
      return;
    }
    if (!product) {
      setError("Busca un producto antes de guardar");
      return;
    }
    if (!Number.isInteger(cajas) || cajas < 1 || !Number.isInteger(unidadesPorCaja) || unidadesPorCaja < 1) {
      setError("Las cajas y las unidades por caja deben ser enteros positivos");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/v5/${id}/counts`, {
        method: "POST",
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          operatorId: operator.id,
          code: product.code,
          cajas,
          unidadesPorCaja,
          notes: notes.trim() || undefined,
          inputMethod: "MANUAL",
        }),
      });
      setToast(`${product.description} guardado: ${total} ${product.unit}`);
      setProductCode("");
      setProduct(null);
      setCajas(1);
      setUnidadesPorCaja(1);
      setNotes("");
      await load();
      window.setTimeout(() => productInputRef.current?.focus(), 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el registro");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: "OPEN" | "REVIEW") {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/v5/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setToast(status === "REVIEW" ? "Sesión enviada a revisión" : "Sesión reabierta");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la sesión");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );
  }

  if (!session) {
    return <div className="py-20 text-center text-slate-500">Sesión V5 no encontrada.</div>;
  }

  if (!operator) {
    return (
      <div className="mx-auto max-w-sm space-y-6 p-4 pt-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <UserRound size={28} className="text-teal-600" />
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-teal-600">Sesión V5</p>
          <h1 className="mt-1 text-xl font-bold">{session.name}</h1>
          <p className="mt-2 text-sm text-slate-500">Identifica al operador para registrar las capturas.</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">
            <Input
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              placeholder="Nombre del operador"
              className="h-12 text-center text-lg"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleJoin();
              }}
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <Button className="h-12 w-full text-base" onClick={() => void handleJoin()} disabled={joining || !operatorName.trim()}>
              {joining && <LoaderCircle className="mr-2 animate-spin" size={17} />}
              Ingresar a la sesión
            </Button>
          </CardContent>
        </Card>
        <Link href="/sessions/v5" className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-600">
          <ArrowLeft size={15} /> Volver a sesiones V5
        </Link>
      </div>
    );
  }

  const canCapture = session.status === "OPEN";

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/sessions/v5" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{session.name}</h1>
            <p className="text-[11px] text-slate-400">{session.code} · {operator.name}</p>
          </div>
          <Link href={`/sessions/v5/${id}/history`}>
            <Button size="sm" variant="outline">
              <History size={14} /> Historial
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-3 p-4 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={session.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"}>
              {session.status === "OPEN" ? "Captura abierta" : session.status === "REVIEW" ? "En revisión" : session.status}
            </Badge>
            <span className="text-xs text-slate-500">Operador: {operator.name}</span>
          </div>
          <span className="text-xs text-slate-400">{summary?.totalRecords ?? 0} registros guardados</span>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

        {canCapture ? (
          <Card className="border-teal-200 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-teal-100 text-teal-700">
                  <ScanBarcode size={17} />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-800">Ingresar producto</h2>
                  <p className="text-xs text-slate-500">La descripción se carga desde el catálogo.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  ref={productInputRef}
                  value={productCode}
                  onChange={(event) => handleProductChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleProductSearch();
                  }}
                  placeholder="Código o código de barras"
                  className="h-12 text-base"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-12 shrink-0 px-0"
                  onClick={() => void handleProductSearch()}
                  disabled={productLoading || !productCode.trim()}
                  aria-label="Buscar producto"
                >
                  {productLoading ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}
                </Button>
              </div>

              {product && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-3.5">
                  <p className="text-base font-bold leading-tight text-teal-800">{product.description}</p>
                  <p className="mt-1 text-xs text-teal-700">
                    Código: <strong>{product.code}</strong> · Unidad: <strong>{product.unit}</strong>
                  </p>
                </div>
              )}

              {product && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="v5-boxes" className="mb-1.5 block text-xs font-medium text-slate-500">Cantidad de cajas</label>
                      <Input
                        id="v5-boxes"
                        ref={boxesInputRef}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={cajas || ""}
                        onChange={(event) => setCajas(Number(event.target.value))}
                        className="h-12 text-center text-lg font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="v5-units" className="mb-1.5 block text-xs font-medium text-slate-500">Unidades por caja</label>
                      <Input
                        id="v5-units"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={unidadesPorCaja || ""}
                        onChange={(event) => setUnidadesPorCaja(Number(event.target.value))}
                        className="h-12 text-center text-lg font-bold"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 px-4 py-4 text-center shadow-sm">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-teal-100">Cantidad total</p>
                    <p className="mt-0.5 text-4xl font-black leading-none text-white">{Number.isFinite(total) ? total : 0}</p>
                    <p className="mt-1 text-xs text-teal-100">{cajas || 0} cajas × {unidadesPorCaja || 0} unidades por caja</p>
                  </div>

                  <div>
                    <label htmlFor="v5-notes" className="mb-1.5 block text-xs font-medium text-slate-500">Comentario (opcional)</label>
                    <textarea
                      id="v5-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ej: caja dañada, producto incompleto..."
                      maxLength={500}
                      className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <Button className="h-12 w-full text-base font-semibold" onClick={() => void handleRegister()} disabled={busy}>
                    {busy ? <LoaderCircle className="mr-2 animate-spin" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
                    Guardar registro
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-sm text-purple-800">
              Esta sesión está en revisión o cerrada. Puedes consultar el historial, pero no agregar nuevos registros.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList size={17} className="text-teal-600" />
                <h2 className="font-semibold text-slate-800">Últimos registros</h2>
              </div>
              <Link href={`/sessions/v5/${id}/history`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
                Ver historial completo
              </Link>
            </div>

            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aún no hay registros guardados.</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{event.productDescription}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{event.productCode} · {event.operatorName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-teal-700">{event.total} {event.productUnit}</p>
                        <p className="text-[11px] text-slate-400">{event.cajas} × {event.unidadesPorCaja}</p>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>{formatDateTimeLima(event.createdAt)}</span>
                      {event.notes && <span className="italic">{event.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-500">{summary?.productCount ?? 0} productos · {summary?.totalCajas ?? 0} cajas</p>
            <p className="text-lg font-black leading-none text-teal-700">{summary?.totalUnits ?? 0} <span className="text-xs font-normal text-slate-400">unidades</span></p>
          </div>
          {session.status === "OPEN" && events.length > 0 && (
            <Button variant="outline" className="h-11" onClick={() => void changeStatus("REVIEW")} disabled={busy}>
              <Send size={15} className="mr-1.5" /> Enviar a revisión
            </Button>
          )}
          {session.status === "REVIEW" && (
            <Button variant="outline" className="h-11" onClick={() => void changeStatus("OPEN")} disabled={busy}>
              Continuar captura
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
