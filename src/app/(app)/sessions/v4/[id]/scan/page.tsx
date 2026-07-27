"use client";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
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
  X,
  ClipboardList,
  CheckCircle2,
  Layers,
  Send,
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
  countedBoxes: string[];
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

function parseBoxRange(input: string): number[] {
  if (!input.trim()) return [];
  const parts = input.split(",");
  const result: number[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end < start) continue;
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1) result.push(num);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function compressBoxes(boxes: number[]): string {
  if (boxes.length === 0) return "";
  const ranges: string[] = [];
  let start = boxes[0];
  let end = boxes[0];
  for (let i = 1; i < boxes.length; i++) {
    if (boxes[i] === end + 1) {
      end = boxes[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = boxes[i];
      end = boxes[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

const PRESETS = [
  { label: "1-10", range: "1-10" },
  { label: "1-50", range: "1-50" },
  { label: "1-100", range: "1-100" },
  { label: "1-200", range: "1-200" },
];

export default function V4ScanPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const [operator, setOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState("");

  const [operators, setOperators] = useState<Operator[]>([]);
  const [countedByOperatorId, setCountedByOperatorId] = useState("");
  const [joining, setJoining] = useState(false);
  const [, startTransition] = useTransition();

  const [importCode, setImportCode] = useState("");
  const [palletNumber, setPalletNumber] = useState("");
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [boxRangeInput, setBoxRangeInput] = useState("");
  const [countedBoxes, setCountedBoxes] = useState<string[]>([]);

  const [existingImports, setExistingImports] = useState<{ id: string; code: string; description: string | null }[]>([]);
  const [existingPallets, setExistingPallets] = useState<{ id: string; number: string }[]>([]);

  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSuggestions, setProductSuggestions] = useState<ProductData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [cajas, setCajas] = useState(1);
  const [unidadesPorCaja, setUnidadesPorCaja] = useState(1);
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [showEntries, setShowEntries] = useState(false);

  const productInputRef = useRef<HTMLInputElement>(null);
  const cajasInputRef = useRef<HTMLInputElement>(null);
  const boxRangeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("stockscan_operator_v4");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        startTransition(() => {
          setOperator(parsed);
          setOperatorName(parsed.name);
        });
      } catch {
        localStorage.removeItem("stockscan_operator_v4");
      }
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("stockscan_operators_v4");
    if (cached) {
      try {
        startTransition(() => { setOperators(JSON.parse(cached) as Operator[]); });
      } catch {
        localStorage.removeItem("stockscan_operators_v4");
      }
    }
    void apiFetch<{ operators: Operator[] }>("/api/operators")
      .then((data) => {
        startTransition(() => { setOperators(data.operators); });
        localStorage.setItem("stockscan_operators_v4", JSON.stringify(data.operators));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const participants = session?.sessionParticipants?.map(({ operator: participant }) => participant) ?? [];
    if (participants.length === 0) return;
    startTransition(() => {
      setOperators((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        for (const participant of participants) merged.set(participant.id, participant);
        return Array.from(merged.values());
      });
    });
  }, [session]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ session: SessionData }>(`/api/sessions/v4/${id}`);
      startTransition(() => { setSession(data.session); });
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [id, startTransition]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast(message);
    setToastType(type);
  }

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
    } catch {
      showToast("Error al identificar", "error");
    } finally {
      setJoining(false);
    }
  }

  async function loadImports() {
    try {
      const data = await apiFetch<{ imports: { id: string; code: string; description: string | null }[] }>(`/api/sessions/v4/${id}/structure`);
      startTransition(() => { setExistingImports(data.imports); });
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    void loadImports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImportChange(value: string) {
    setImportCode(value);
    setPalletNumber("");
    setSelectedBoxes([]);
    setBoxRangeInput("");
    setCountedBoxes([]);
    setExistingPallets([]);
    if (!value.trim()) return;
    try {
      const data = await apiFetch<StructureData>(`/api/sessions/v4/${id}/structure?importCode=${encodeURIComponent(value.trim())}`);
      setExistingPallets(data.pallets);
    } catch {
      /* silent */
    }
  }

  async function handlePalletChange(value: string) {
    setPalletNumber(value);
    setSelectedBoxes([]);
    setBoxRangeInput("");
    setCountedBoxes([]);
    if (!value.trim() || !importCode.trim()) return;
    try {
      const data = await apiFetch<StructureData>(
        `/api/sessions/v4/${id}/structure?importCode=${encodeURIComponent(importCode.trim())}&palletId=${encodeURIComponent(value.trim())}`,
      );
      setCountedBoxes(data.countedBoxes);
      if (data.boxes.length > 0) {
        const maxBox = Math.max(...data.boxes.map((b) => parseInt(b.number, 10)).filter((n) => !isNaN(n)));
        setBoxRangeInput(`1-${maxBox}`);
        const parsed = parseBoxRange(`1-${maxBox}`);
        setSelectedBoxes(parsed.filter((n) => !data.countedBoxes.includes(String(n))));
      }
    } catch {
      /* silent */
    }
  }

  function handleBoxRangeInputChange(value: string) {
    setBoxRangeInput(value);
    const parsed = parseBoxRange(value);
    setSelectedBoxes(parsed.filter((n) => !countedBoxes.includes(String(n))));
  }

  function applyPreset(range: string) {
    setBoxRangeInput(range);
    const parsed = parseBoxRange(range);
    setSelectedBoxes(parsed.filter((n) => !countedBoxes.includes(String(n))));
    setTimeout(() => boxRangeInputRef.current?.focus(), 50);
  }

  async function handleProductSearch() {
    const code = productCode.trim();
    if (!code) return;
    setProductLoading(true);
    setProductError("");
    setProduct(null);
    setShowSuggestions(false);
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

  function handleProductInputChange(value: string) {
    setProductCode(value);
    setProduct(null);
    setProductError("");
    setHighlightIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ products: ProductData[] }>(`/api/products?search=${encodeURIComponent(value.trim())}`);
        setProductSuggestions(data.products.slice(0, 8));
        setShowSuggestions(data.products.length > 0);
      } catch {
        setProductSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
  }

  function selectProduct(p: ProductData) {
    setProduct(p);
    setProductCode(p.code);
    setShowSuggestions(false);
    setProductSuggestions([]);
    setProductError("");
    setTimeout(() => cajasInputRef.current?.focus(), 100);
  }

  function handleProductKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || productSuggestions.length === 0) {
      if (e.key === "Enter") void handleProductSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < productSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : productSuggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < productSuggestions.length) {
        selectProduct(productSuggestions[highlightIdx]);
      } else {
        void handleProductSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  const total = cajas * unidadesPorCaja;

  async function handleRegister() {
    if (!product) {
      showToast("Primero busca un producto", "error");
      return;
    }
    if (!operator) {
      showToast("Identifícate primero", "error");
      return;
    }
    if (!importCode.trim()) {
      showToast("Ingresa la importación", "error");
      return;
    }
    if (selectedBoxes.length === 0) {
      showToast("Selecciona al menos una caja", "error");
      return;
    }
    if (cajas <= 0 || unidadesPorCaja <= 0) {
      showToast("Cajas y unidades por caja deben ser mayores a 0", "error");
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

      const newCounted = selectedBoxes.map((n) => String(n));
      setCountedBoxes((prev) => [...prev, ...newCounted].sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      }));

      showToast(`Registrado en ${selectedBoxes.length} caja(s)`, "success");
      setProductCode("");
      setProduct(null);
      setProductSuggestions([]);
      setShowSuggestions(false);
      setCajas(1);
      setUnidadesPorCaja(1);
      setNotes("");
      setSelectedBoxes([]);
      setBoxRangeInput("");
      setTimeout(() => productInputRef.current?.focus(), 100);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error al registrar", "error");
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
      showToast("Enviado a revisión", "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando...
      </div>
    );
  if (!session)
    return <div className="py-20 text-center text-slate-500">Sesión no encontrada.</div>;

  if (!operator) {
    return (
      <div className="mx-auto max-w-sm space-y-6 p-4 pt-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <Package size={28} className="text-teal-600" />
          </div>
          <h1 className="text-xl font-bold">{session.name}</h1>
          <p className="text-sm text-slate-500">Identifícate para comenzar a contar</p>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5 space-y-4">
            <Input
              placeholder="Tu nombre"
              className="h-12 text-center text-lg"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
              autoFocus
            />
            <Button
              className="h-12 w-full text-base font-semibold"
              onClick={() => void handleJoin()}
              disabled={joining || !operatorName.trim()}
            >
              {joining ? <LoaderCircle className="mr-2 animate-spin" size={18} /> : null}
              Ingresar a la sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const countedNums = countedBoxes.map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  const availableCount = selectedBoxes.length;
  const countedCount = countedBoxes.length;

  const toastColors = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
          <div className={`rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg ${toastColors[toastType]}`}>
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/sessions/v4" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{session.name}</h1>
            <p className="text-[11px] text-slate-400">{session.code} · {operator.name}</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={() => setShowEntries(!showEntries)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
            >
              <ClipboardList size={18} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                {entries.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-3xl space-y-3 p-4 pb-32">

        {/* Step 1: Structure */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">1</span>
              <p className="text-sm font-semibold text-slate-800">Estructura</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Importación
                </label>
                <input
                  list="import-options-v4"
                  value={importCode}
                  onChange={(e) => void handleImportChange(e.target.value)}
                  placeholder="Ej: IMP-001"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <datalist id="import-options-v4">
                  {existingImports.map((imp) => (
                    <option key={imp.id} value={imp.code}>{imp.code}{imp.description ? ` — ${imp.description}` : ""}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Pallet <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  list="pallet-options-v4"
                  value={palletNumber}
                  onChange={(e) => void handlePalletChange(e.target.value)}
                  placeholder="Ej: PAL-01"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <datalist id="pallet-options-v4">
                  {existingPallets.map((p) => (
                    <option key={p.id} value={p.number}>{p.number}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Counted boxes indicator */}
            {countedCount > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-700">
                    {countedCount} caja{countedCount !== 1 ? "s" : ""} contada{countedCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {countedNums.map((num) => (
                    <span key={num} className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-700">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Box selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-500">
                  Seleccionar cajas
                </label>
                {availableCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                    <Layers size={12} />
                    {availableCount}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.range}
                    type="button"
                    onClick={() => applyPreset(preset.range)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 active:bg-teal-50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                ref={boxRangeInputRef}
                value={boxRangeInput}
                onChange={(e) => handleBoxRangeInputChange(e.target.value)}
                placeholder="Ej: 1-50, 55, 60-70"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Rangos: 1-50 · Individuales: 55 · Mixto: 1-10, 15, 20-30
              </p>
            </div>

            {/* Selected boxes preview */}
            {availableCount > 0 && (
              <div className="rounded-xl bg-teal-50 border border-teal-200 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-teal-700 mb-1">
                  Seleccionadas:
                </p>
                <p className="text-xs text-teal-600 break-all leading-relaxed">
                  {compressBoxes(selectedBoxes)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Product */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">2</span>
              <p className="text-sm font-semibold text-slate-800">Producto</p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1" ref={suggestionsRef}>
                <Input
                  ref={productInputRef}
                  value={productCode}
                  onChange={(e) => handleProductInputChange(e.target.value)}
                  onKeyDown={handleProductKeyDown}
                  onFocus={() => {
                    if (productSuggestions.length > 0 && productCode.trim().length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder="Código o nombre del producto"
                  className="h-12 rounded-xl pr-10"
                  autoFocus
                />
                {productLoading && (
                  <LoaderCircle size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-500 animate-spin" />
                )}
                {!productLoading && (
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && productSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {productSuggestions.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectProduct(s);
                        }}
                        className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                          idx === highlightIdx
                            ? "bg-teal-50 text-teal-800"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <Search size={14} className="shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.description}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.code}
                            {s.supplierCode ? ` · Prov: ${s.supplierCode}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="h-12 w-12 rounded-xl px-0"
                onClick={() => void handleProductSearch()}
                disabled={productLoading || !productCode.trim()}
              >
                {productLoading ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}
              </Button>
            </div>

            {productError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
                {productError}
              </div>
            )}

            {product && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3.5">
                <p className="text-sm font-bold text-teal-800 leading-tight">{product.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-600">
                  <span>Código: <strong className="text-teal-800">{product.code}</strong></span>
                  {product.supplierCode && <span>Proveedor: <strong className="text-teal-800">{product.supplierCode}</strong></span>}
                  <span>Unidad: <strong className="text-teal-800">{product.unit}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Quantity */}
        {product && (
          <Card className="border-0 shadow-sm border-t-2 border-t-teal-500">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">3</span>
                <p className="text-sm font-semibold text-slate-800">Cantidad</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Cajas</label>
                  <Input
                    ref={cajasInputRef}
                    type="number"
                    inputMode="numeric"
                    value={cajas || ""}
                    onChange={(e) => setCajas(parseInt(e.target.value || "0", 10))}
                    min={1}
                    className="h-12 rounded-xl text-lg font-bold text-center"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Unidades/caja</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={unidadesPorCaja || ""}
                    onChange={(e) => setUnidadesPorCaja(parseInt(e.target.value || "0", 10))}
                    min={1}
                    className="h-12 rounded-xl text-lg font-bold text-center"
                  />
                </div>
              </div>

              {/* Total display */}
              <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 px-4 py-4 text-center shadow-sm">
                <p className="text-[11px] font-medium text-teal-100 uppercase tracking-wider">Total</p>
                <p className="text-4xl font-black text-white leading-none mt-0.5">{total}</p>
                <p className="text-xs text-teal-100 mt-1">
                  {cajas} cajas × {unidadesPorCaja} unds/caja
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Observación (opcional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: caja dañada, producto incompleto..."
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Operario que contó
                </label>
                <select
                  value={countedByOperatorId}
                  onChange={(e) => setCountedByOperatorId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                >
                  <option value="">Seleccionar operario...</option>
                  {operators
                    .filter((item) => item.id !== operator?.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky bottom bar */}
      {product && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-area-pb">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 truncate">{product.description}</p>
              <p className="text-lg font-black text-teal-700 leading-none">{total} <span className="text-xs font-normal text-slate-400">unds</span></p>
            </div>
            <Button
              className="h-12 rounded-xl px-6 text-base font-semibold shadow-sm"
              onClick={() => void handleRegister()}
              disabled={busy || cajas <= 0 || unidadesPorCaja <= 0}
            >
              {busy ? (
                <LoaderCircle className="mr-2 animate-spin" size={18} />
              ) : (
                <CheckCircle2 size={18} className="mr-2" />
              )}
              Registrar
            </Button>
          </div>
        </div>
      )}

      {/* Send to review button (always visible) */}
      {!product && entries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-area-pb">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">{entries.length} registro{entries.length !== 1 ? "s" : ""}</p>
            </div>
            <Button
              variant="outline"
              className="h-12 rounded-xl px-5 font-semibold"
              onClick={() => void handleSendToReview()}
              disabled={busy}
            >
              <Send size={16} className="mr-2" />
              Enviar a revisión
            </Button>
          </div>
        </div>
      )}

      {/* Entries drawer (mobile) */}
      {showEntries && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEntries(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl bg-white shadow-2xl">
            <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                <Boxes size={16} className="inline mr-1.5 text-teal-600" />
                Registros ({entries.length})
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 h-8" onClick={() => { setEntries([]); setShowEntries(false); }}>
                  <X size={12} className="mr-1" /> Limpiar
                </Button>
                <button onClick={() => setShowEntries(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto p-4 max-h-[calc(70vh-56px)]">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-slate-800">{entry.productName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {entry.productCode}
                      {entry.supplierCode ? ` · Prov: ${entry.supplierCode}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-teal-700">
                      {entry.cajas} × {entry.unidadesPorCaja} = <Hash size={12} className="inline" />{entry.total}
                    </p>
                    {entry.notes && (
                      <p className="text-[11px] text-slate-400 italic truncate max-w-[120px] mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
