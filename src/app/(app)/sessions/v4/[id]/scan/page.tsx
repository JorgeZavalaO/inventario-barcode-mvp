"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  LoaderCircle,
  Package,
  Search,
  Boxes,
  Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


type SessionData = {
  id: string;
  code: string;
  name: string;
  status: string;
  sessionParticipants?: { operator: { id: string; name: string } }[];
};

type Operator = { id: string; name: string };

type ProductData = {
  id: string;
  code: string;
  description: string;
  unit: string;
  supplierCode: string | null;
  theoreticalStock: number;
};

type StructureData = {
  import: { id: string; code: string } | null;
  pallets: { id: string; number: string }[];
  boxes: { id: string; number: string }[];
};

type RegisterEntry = {
  id: string;
  productCode: string;
  productName: string;
  supplierCode: string;
  cajas: number;
  unidadesPorCaja: number;
  total: number;
  notes: string;
  createdAt: Date;
};

export default function V4ScanPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [step, setStep] = useState<"IDENTIFY" | "COUNT" | "SUMMARY">("IDENTIFY");

  const [operator, setOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState("");

  const [operators, setOperators] = useState<Operator[]>([]);
  const [countedByOperatorId, setCountedByOperatorId] = useState("");
  const [joining, setJoining] = useState(false);

  const [importCode, setImportCode] = useState("");
  const [palletNumber, setPalletNumber] = useState("");
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);


  const [existingImports, setExistingImports] = useState<{ id: string; code: string; description: string | null }[]>([]);
  const [existingPallets, setExistingPallets] = useState<{ id: string; number: string }[]>([]);

  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  const [cajas, setCajas] = useState(1);
  const [unidadesPorCaja, setUnidadesPorCaja] = useState(1);
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState<RegisterEntry[]>([]);

  const productInputRef = useRef<HTMLInputElement>(null);
  const cajasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("stockscan_operator_v4");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOperator(parsed);
        setOperatorName(parsed.name);
      } catch {
        localStorage.removeItem("stockscan_operator_v4");
      }
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("stockscan_operators_v4");
    if (cached) {
      try {
        setOperators(JSON.parse(cached) as Operator[]);
      } catch {
        localStorage.removeItem("stockscan_operators_v4");
      }
    }
    void apiFetch<{ operators: Operator[] }>("/api/operators")
      .then((data) => {
        setOperators(data.operators);
        localStorage.setItem("stockscan_operators_v4", JSON.stringify(data.operators));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const participants = session?.sessionParticipants?.map(({ operator: participant }) => participant) ?? [];
    if (participants.length === 0) return;
    setOperators((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      for (const participant of participants) merged.set(participant.id, participant);
      return Array.from(merged.values());
    });
  }, [session]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ session: SessionData }>(`/api/sessions/v4/${id}`);
      setSession(data.session);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleJoin() {
    if (!operatorName.trim()) return;
    setJoining(true);
    try {
      const result = await apiFetch<{ operator: Operator }>(`/api/sessions/v4/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ name: operatorName.trim() }),
      });
      setOperator(result.operator);
      setOperatorName(result.operator.name);
      setOperators((current) => current.some((item) => item.id === result.operator.id) ? current : [...current, result.operator]);
      localStorage.setItem("stockscan_operator_v4", JSON.stringify(result.operator));
      setStep("COUNT");
    } catch {
      setToast("Error al identificar");
    } finally {
      setJoining(false);
    }
  }

  async function loadImports() {
    try {
      const data = await apiFetch<{ imports: { id: string; code: string; description: string | null }[] }>(`/api/sessions/v4/${id}/structure`);
      setExistingImports(data.imports);
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    if (step === "COUNT") void loadImports();
  }, [step]);

  async function handleImportChange(value: string) {
    setImportCode(value);
    setPalletNumber("");
    setSelectedBoxes([]);
    setExistingPallets([]);
    if (!value.trim()) return;
    try {
      const data = await apiFetch<StructureData>(`/api/sessions/v4/${id}/structure?importCode=${encodeURIComponent(value.trim())}`);
      setExistingPallets(data.pallets);
    } catch {
      /* silent */
    }
  }

  function toggleBox(num: number) {
    setSelectedBoxes((prev) =>
      prev.includes(num) ? prev.filter((b) => b !== num) : [...prev, num].sort((a, b) => a - b)
    );
  }

  function selectAllBoxes() {
    setSelectedBoxes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }

  async function handleProductSearch() {
    const code = productCode.trim();
    if (!code) return;
    setProductLoading(true);
    setProductError("");
    setProduct(null);
    try {
      const data = await apiFetch<{ product: ProductData }>(`/api/products/by-code?code=${encodeURIComponent(code)}`);
      setProduct(data.product);
      setTimeout(() => cajasInputRef.current?.focus(), 100);
    } catch {
      setProductError("Producto no encontrado");
    } finally {
      setProductLoading(false);
    }
  }

  const total = cajas * unidadesPorCaja;

  async function handleRegister() {
    if (!product) {
      setToast("Primero busca un producto");
      return;
    }
    if (!operator) {
      setToast("Identifícate primero");
      return;
    }
    if (!importCode.trim()) {
      setToast("Ingresa la importación");
      return;
    }
    if (selectedBoxes.length === 0) {
      setToast("Selecciona al menos una caja");
      return;
    }
    if (cajas <= 0 || unidadesPorCaja <= 0) {
      setToast("Cajas y unidades por caja deben ser mayores a 0");
      return;
    }
    setBusy(true);
    try {
      for (const boxNum of selectedBoxes) {
        const operationId = crypto.randomUUID();
        await apiFetch(`/api/sessions/v4/${id}/counts`, {
          method: "POST",
          body: JSON.stringify({
            operationId,
            operatorId: operator.id,
            countedByOperatorId: countedByOperatorId || undefined,
            importCode: importCode.trim(),
            palletNumber: palletNumber.trim() || undefined,
            boxNumber: String(boxNum),
            productId: product.id,
            cajas,
            unidadesPorCaja,
            notes: notes.trim() || undefined,
          }),
        });
      }

      const entry: RegisterEntry = {
        id: crypto.randomUUID(),
        productCode: product.code,
        productName: product.description,
        supplierCode: product.supplierCode ?? "",
        cajas,
        unidadesPorCaja,
        total,
        notes: notes.trim(),
        createdAt: new Date(),
      };
      setEntries((prev) => [entry, ...prev]);

      setToast(`Registrado en ${selectedBoxes.length} caja(s)`);
      setProductCode("");
      setProduct(null);
      setCajas(1);
      setUnidadesPorCaja(1);
      setNotes("");
      setTimeout(() => productInputRef.current?.focus(), 100);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al registrar");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendToReview() {
    setBusy(true);
    try {
      await apiFetch(`/api/sessions/v4/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REVIEW" }),
      });
      setToast("Enviado a revisión");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );
  if (!session)
    return <div className="py-16 text-center text-slate-500">Sesión no encontrada.</div>;

  if (!operator) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-4">
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-slate-500">{session.name}</p>
          <h1 className="text-xl font-bold">Identifícate</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tu nombre quedará registrado en cada lectura.
          </p>
        </div>
        <Card>
          <CardContent className="p-3 space-y-3">
            <Input
              placeholder="Tu nombre"
              className="h-11 text-center text-lg"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
              autoFocus
            />
            <Button
              className="h-12 w-full"
              onClick={() => void handleJoin()}
              disabled={joining || !operatorName.trim()}
            >
              {joining ? <LoaderCircle className="animate-spin" size={16} /> : null}
              Ingresar a la sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v4" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">{session.name}</h1>
          <p className="text-xs text-slate-400">{session.code} · Digitador: {operator.name}</p>
        </div>
        {toast && (
          <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-600">
            {toast}
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setStep("COUNT")}>
          <Package size={14} className="mr-1" /> Contar
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleSendToReview()} disabled={busy || entries.length === 0}>
          Enviar a revisión
        </Button>
        <Link href={`/sessions/v4/${id}/review`}>
          <Button variant="ghost" size="sm">Avances</Button>
        </Link>
      </div>

      {step === "COUNT" && (
        <div className="space-y-4">

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Estructura</p>
                <p className="text-xs text-slate-400">
                  Cajas seleccionadas: {selectedBoxes.length > 0 ? selectedBoxes.join(", ") : "ninguna"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Importación
                  </label>
                  <input
                    list="import-options-v4"
                    value={importCode}
                    onChange={(e) => void handleImportChange(e.target.value)}
                    placeholder="Ej: IMP-001"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:outline-none"
                  />
                  <datalist id="import-options-v4">
                    {existingImports.map((imp) => (
                      <option key={imp.id} value={imp.code}>{imp.code}{imp.description ? ` — ${imp.description}` : ""}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Pallet <span className="text-slate-400">(opcional)</span>
                  </label>
                  <input
                    list="pallet-options-v4"
                    value={palletNumber}
                    onChange={(e) => setPalletNumber(e.target.value)}
                    placeholder="Ej: PAL-01"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:outline-none"
                  />
                  <datalist id="pallet-options-v4">
                    {existingPallets.map((p) => (
                      <option key={p.id} value={p.number}>{p.number}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">
                    Cajas (seleccionar las que existen)
                  </label>
                  <button
                    type="button"
                    onClick={selectAllBoxes}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Seleccionar 1-10
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleBox(num)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                        selectedBoxes.includes(num)
                          ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                          : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Producto</p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={productInputRef}
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleProductSearch();
                    }}
                    placeholder="Código del producto"
                    className="h-11 pr-9"
                    autoFocus
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <Button
                  variant="outline"
                  className="h-11 px-4"
                  onClick={() => void handleProductSearch()}
                  disabled={productLoading || !productCode.trim()}
                >
                  {productLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Search size={16} />}
                </Button>
              </div>

              {productError && (
                <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{productError}</p>
              )}

              {product && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-1">
                  <p className="text-base font-bold text-teal-800">{product.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-teal-700">
                    <span>Código: <strong>{product.code}</strong></span>
                    {product.supplierCode && <span>Proveedor: <strong>{product.supplierCode}</strong></span>}
                    <span>Unidad: <strong>{product.unit}</strong></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {product && (
            <Card className="border-teal-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Cantidad</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Cajas</label>
                    <Input
                      ref={cajasInputRef}
                      type="number"
                      inputMode="numeric"
                      value={cajas || ""}
                      onChange={(e) => setCajas(parseInt(e.target.value || "0", 10))}
                      min={1}
                      className="h-11 text-lg font-bold text-center"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Unidades por caja</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={unidadesPorCaja || ""}
                      onChange={(e) => setUnidadesPorCaja(parseInt(e.target.value || "0", 10))}
                      min={1}
                      className="h-11 text-lg font-bold text-center"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-100 px-4 py-3 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-3xl font-black text-teal-700">{total}</p>
                  <p className="text-xs text-slate-400">
                    {cajas} cajas × {unidadesPorCaja} unds/caja
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Observación (opcional)</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: caja dañada, producto incompleto..."
                    className="h-10 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Operario que contó
                  </label>
                  <select
                    value={countedByOperatorId}
                    onChange={(e) => setCountedByOperatorId(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">Seleccionar operario...</option>
                    {operators
                      .filter((item) => item.id !== operator?.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                  </select>
                </div>

                <Button
                  className="h-12 w-full text-base"
                  onClick={() => void handleRegister()}
                  disabled={busy || cajas <= 0 || unidadesPorCaja <= 0}
                >
                  {busy ? (
                    <LoaderCircle className="mr-2 animate-spin" size={16} />
                  ) : (
                    <Package size={16} className="mr-2" />
                  )}
                  Registrar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">
                <Boxes size={14} className="inline mr-1" />
                Registros ({entries.length})
              </p>
              <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => setEntries([])}>
                Limpiar todo
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.productName}</p>
                    <p className="text-xs text-slate-400">
                      {entry.productCode}
                      {entry.supplierCode ? ` · Prov: ${entry.supplierCode}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-teal-700">
                      {entry.cajas} × {entry.unidadesPorCaja} = <Hash size={12} className="inline" />{entry.total}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-slate-400 italic truncate max-w-[140px]">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
